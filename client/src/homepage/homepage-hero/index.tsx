import "./index.scss";
import { Search } from "../../ui/molecules/search";
import Mandala from "../../ui/molecules/mandala";
import { ORGANIZATION } from "../../env";

export function HomepageHero() {
  return (
    <div className="homepage-hero dark">
      <section>
        <h1>
          Resources for <u>Developers</u>,
          <br /> by Developers
        </h1>
        <p>
          Documenting web technologies, including CSS, HTML, and JavaScript
          {ORGANIZATION === "MDN" && <>, since 2005</>}.
        </p>
        <Search id="hp-search" isHomepageSearch={true} />
      </section>
      <Mandala rotate={true} extraClasses="homepage-hero-bg" />
    </div>
  );
}
