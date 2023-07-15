import {
  buildAuthors,
  buildBlogFeed,
  buildBlogIndex,
  buildBlogPosts,
} from "./blog.js";
import { BLOG_IS_ENABLED } from "../libs/env/index.js";

if (BLOG_IS_ENABLED) {
  await buildBlogIndex({ verbose: true });
  await buildBlogPosts({ verbose: true });
  await buildAuthors({ verbose: true });
  await buildBlogFeed({ verbose: true });
}
