"use strict";

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-install-tabs]").forEach((tabs) => {
        const buttons = Array.from(tabs.querySelectorAll("[role='tab']"));
        const panels = Array.from(tabs.querySelectorAll("[role='tabpanel']"));

        const activateTab = (button, moveFocus = false) => {
            const selectedTab = button.dataset.tab;

            buttons.forEach((item) => {
                const active = item === button;
                item.classList.toggle("is-active", active);
                item.setAttribute("aria-selected", String(active));
                item.tabIndex = active ? 0 : -1;
            });

            panels.forEach((panel) => {
                const active = panel.dataset.panel === selectedTab;
                panel.classList.toggle("is-active", active);
                panel.hidden = !active;
            });

            if (moveFocus) {
                button.focus();
            }
        };

        buttons.forEach((button, index) => {
            button.addEventListener("click", () => activateTab(button));
            button.addEventListener("keydown", (event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                    return;
                }

                event.preventDefault();
                let nextIndex = index;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + buttons.length) % buttons.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = buttons.length - 1;
                activateTab(buttons[nextIndex], true);
            });
        });
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const layout = document.querySelector(".docs-layout");
    const toggle = document.getElementById("docs-sidebar-toggle");
    if (!layout || !toggle) {
        return;
    }

    const setCollapsed = (collapsed) => {
        layout.classList.toggle("is-sidebar-collapsed", collapsed);
        toggle.setAttribute("aria-expanded", String(!collapsed));
        toggle.setAttribute("aria-label", collapsed ? "Expand table of contents" : "Collapse table of contents");
        toggle.title = collapsed ? "Expand table of contents" : "Collapse table of contents";
    };

    toggle.addEventListener("click", () => { setCollapsed(!layout.classList.contains("is-sidebar-collapsed")); });
});
