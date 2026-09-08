import { maybeById } from "../dom";
import { vscode } from "../globals";

type AboutTab = | "about" | "supportedFormats";

export function openAboutTab(
    tab: AboutTab = "about"
): void {
    setAboutTab(tab);
}

export function bindAboutModalActions(): void {
    maybeById("about-tab-about")?.addEventListener("click", () =>
        {setAboutTab("about");}
    );

    maybeById("about-tab-supported-formats")?.addEventListener("click", () =>
        {setAboutTab("supportedFormats");}
    );

    maybeById("about-open-supported-formats")?.addEventListener("click", () =>
        {setAboutTab("supportedFormats");}
    );

    maybeById("about-version-copy")?.addEventListener("click", () => {
        const version = maybeById<HTMLElement>("about-version-value")?.textContent?.trim();

        if (!version) {
            return;
        }

        vscode.postMessage({type: "copyText", text: version});
    });

}

function setAboutTab(
    tab: AboutTab
): void {
    const aboutTab = maybeById<HTMLElement>("about-tab-about");
    const formatsTab = maybeById<HTMLElement>("about-tab-supported-formats");
    const aboutContent = maybeById<HTMLElement>("about-content");
    const formatsContent = maybeById<HTMLElement>("supported-formats-content");
    const showAbout = tab === "about";

    aboutTab?.classList.toggle("active", showAbout);
    formatsTab?.classList.toggle("active", !showAbout);

    if (aboutContent) {
        aboutContent.style.display = showAbout ? "" : "none";
    }

    if (formatsContent) {
        formatsContent.style.display = showAbout ? "none" : "";
    }
}
