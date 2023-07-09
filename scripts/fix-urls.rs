/*
this file deals with some URL issues so that
the web docs can be hosted as a static site.
specifically:
 - adds some javascript to the 404 page to redirect to
   the lowercase version of the URL
     (e.g. so /en-US/... will redirect to /en-us/...)
   - all links are converted to lowercase to avoid the redirect
 - file paths containing the _colon_, _doublecolon_, and _star_
   escape sequences are copied to corresponding paths containing :, ::, and *
   so that links such as /en-us/docs/web/css/:has/ work.
 - copy runner.html all over the place so that live samples work
   (note: we can't just change all the iframe URLs to "/runner.html" because
    relative URLs inside the iframes would be broken. for example,
    the en-us/docs/web/html/element/img has a live sample with
    an image pointing to "favicon144.png", and that should refer to
    "/en-us/docs/web/html/element/img/favicon144.png", not "/favicon144.png")
*/

use std::borrow::Cow;
use std::fs::{self, read_dir};
use std::path::PathBuf;
use std::process::ExitCode;

const BUILD_DIR: &str = "client/build";

fn process_file(path_buf: &PathBuf) -> Result<(), String> {
    let path = path_buf
        .to_str()
        .ok_or_else(|| format!("Path {} contains invalid UTF-8", path_buf.to_string_lossy()))?;
    let mut new_path = Cow::Borrowed(path);
    let replacements = [("_colon_", ":"), ("_doublecolon_", "::"), ("_star_", "*")];
    for (replace, with) in replacements {
        if new_path.contains(replace) {
            new_path = Cow::Owned(new_path.replace(replace, with));
        }
    }
    if path != new_path {
        let mut dir_path_buf = PathBuf::from(new_path.as_ref());
        dir_path_buf.pop(); // remove filename
        fs::create_dir_all(&dir_path_buf).map_err(|e| {
            format!(
                "Couldn't create directory {}: {e}",
                dir_path_buf.to_string_lossy()
            )
        })?;
        fs::copy(path, new_path.as_ref())
            .map_err(|e| format!("Couldn't copy {path} to {new_path}: {e}"))?;
    }

    if !path.ends_with(".html") && !path.ends_with(".json") {
        return Ok(());
    }

    let file_data = fs::read(path).map_err(|e| format!("Error reading file {path}: {e}"))?;
    let mut file_contents =
        String::from_utf8(file_data).map_err(|e| format!("File {path} has invalid UTF-8 ({e})"))?;

    if file_contents.find("runner.html").is_some() {
        // copy runner.html
        let mut runner = path_buf.clone();
        runner.pop();
        runner.push("runner.html");
        fs::copy(format!("{BUILD_DIR}/runner.html"), &runner).map_err(|e| {
            format!(
                "error copying runner.html to {}: {e}",
                runner.to_string_lossy()
            )
        })?;
    }

    fn fix_url(url: &mut str) {
        if url.starts_with('/') && !url.starts_with("//") {
            let path_end = url.find(&['#', '?']).unwrap_or(url.len());
            let (url_path, _url_params) = url.split_at_mut(path_end);
            url_path.make_ascii_lowercase();
        }
    }

    // we need to handle both "URLs enclosed in quotes"
    // and \"URLs enclosed in escaped quotes\" because react is wacky
    // and generates JSON which is used to construct the document.
    for url_delimiter in ["\"", "\\\""] {
        for (tag, attribute) in [("a", "href"), ("img", "src"), ("form", "action")] {
            let mut i = 0;
            let tag = format!("<{tag}");
            let attribute = format!("{attribute}={url_delimiter}");
            let mut iteration = || -> Option<()> {
                let tag_start = i + file_contents[i..].find(&tag)?;
                i = tag_start;
                // technically > could appear in an attribute but it probably won't
                let tag_end = i + file_contents[i..].find('>')?;
                let Some(j) = file_contents[i..tag_end].find(&attribute) else {
                    // attribute doesn't appear in tag, whatever.
                    i = tag_end;
                    return Some(());
                };
                let url_start = i + j + attribute.len();
                let url_end = url_start + file_contents[url_start..].find(url_delimiter)?;
                fix_url(&mut file_contents[url_start..url_end]);
                i = tag_end;
                Some(())
            };

            while iteration().is_some() {}
        }
    }

    {
        // also some links are contained in JSON as "uri":"/en-US/docs/blablabla"
        // so we need to fix those too
        let search_term = "\"uri\":\"";
        let mut i = 0;
        let mut iteration = || -> Option<()> {
            let url_start = i + file_contents[i..].find(search_term)? + search_term.len();
            let url_end = url_start + file_contents[url_start..].find('"')?;
            fix_url(&mut file_contents[url_start..url_end]);
            i = url_end;
            Some(())
        };
        while iteration().is_some() {}
    }

    fs::write(path, file_contents).map_err(|e| format!("Error writing file {path}: {e}"))?;

    Ok(())
}

fn process_directory(path: &PathBuf) -> Result<(), String> {
    println!("processing {}...", path.to_str().unwrap_or("<bad UTF-8>"));
    let dir = read_dir(path)
        .map_err(|e| format!("Can't read directory {}: {e}", path.to_string_lossy()))?;
    for entry in dir {
        let entry = entry
            .map_err(|e| format!("Error reading directory {}: {e}", path.to_string_lossy()))?;
        let file_type = entry.file_type().map_err(|e| {
            format!(
                "Couldn't get file info for {}: {e}",
                entry.path().to_string_lossy()
            )
        })?;
        if file_type.is_dir() {
            process_directory(&entry.path())?;
        } else if file_type.is_file() {
            if entry.file_name() == "metadata.json" {
                // i don't think these are ever needed, and they take up 700MB
                fs::remove_file(entry.path()).map_err(|e| {
                    format!("Couldn't remove {}: {e}", entry.path().to_string_lossy())
                })?;
            } else {
                process_file(&entry.path())?;
            }
        }
    }
    Ok(())
}

fn process404() -> Result<(), String> {
    // add lowercase conversion to 404 page
    // we could just do this in client/src/page-not-found/index.tsx,
    // but then the script element wouldn't be at the very top of the page,
    // so some parts of the actual 404 page would start loading.
    let path = format!("{BUILD_DIR}/en-us/_spas/404.html");
    let contents = fs::read_to_string(&path).map_err(|e| format!("error reading {path}: {e}"))?;
    if contents.find("// idempotency").is_some() {
        // make sure we don't add the <script> twice if this program is run twice
        return Ok(());
    }
    let contents = contents.replace(
        "<head>",
        "<head><script>
// idempotency
var prevHref = location.href;
var newHref = prevHref.toLowerCase();
if (newHref !== prevHref)
  location.href = newHref;
</script>",
    );
    std::fs::write(&path, contents).map_err(|e| format!("error writing to {path}: {e}"))?;
    Ok(())
}

fn process_main_js() -> Result<(), String> {
    let dir_path = format!("{BUILD_DIR}/static/js");
    let dir = fs::read_dir(&dir_path).map_err(|e| format!("error reading {dir_path}: {e}"))?;
    let mut paths = vec![];
    // find the file called main.something.js
    for entry in dir {
        let entry = entry.map_err(|e| format!("error reading {dir_path}: {e}"))?;
        let name = entry
            .file_name()
            .to_str()
            .ok_or_else(|| format!("file name in {dir_path} contains bad UTF-8"))?
            .to_string();
        if name.starts_with("main.") && name.ends_with(".js") {
            paths.push(entry.path().to_str().unwrap().to_string());
        }
    }
    if paths.is_empty() {
        return Err(format!("couldn't find main.<something>.js in {dir_path}"));
    }
    if paths.len() > 1 {
        return Err(format!(
            "multiple files called main.<something>.js in {dir_path}. that's unexpected."
        ));
    }

    let path = &paths[0];
    let mut contents =
        fs::read_to_string(&path).map_err(|e| format!("error reading {path}: {e}"))?;
    let mut i = 0;

    let mut iteration = || -> Option<()> {
        let url_start = i + contents[i..].find("\"/docs/")? + 1;
        let url_end = url_start + contents[url_start..].find('"')?;
        contents[url_start..url_end].make_ascii_lowercase();
        i = url_end;
        Some(())
    };

    while iteration().is_some() {}

    contents = contents.replace("\"/en-US", "\"/en-us");

    fs::write(&path, contents).map_err(|e| format!("error writing {path}: {e}"))?;

    Ok(())
}

fn try_main() -> Result<(), String> {
    process_main_js()?;
    process404()?;
    process_directory(&BUILD_DIR.to_string().into())?;
    Ok(())
}

fn main() -> ExitCode {
    match try_main() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}
