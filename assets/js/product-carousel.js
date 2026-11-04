"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const carousel = document.getElementById("product-carousel");
    if (!carousel) return;

    const slides = Array.from(carousel.querySelectorAll(".product-carousel-slide"));
    const indicators = Array.from(carousel.querySelectorAll(".product-carousel-indicators button"));
    const title = carousel.querySelector(".product-carousel-title");
    const previousButton = carousel.querySelector(".product-carousel-prev");
    const nextButton = carousel.querySelector(".product-carousel-next");
    const intervalMs = 5000;
    const transitionMs = 900;
    let currentIndex = 0;
    let timerId = 0;
    let isTransitioning = false;

    if (!slides.length || !previousButton || !nextButton) return;

    const updateControls = (index) => {
        indicators.forEach((indicator, indicatorIndex) => {
            const active = indicatorIndex === index;
            indicator.classList.toggle("is-active", active);
            active ? indicator.setAttribute("aria-current", "true") : indicator.removeAttribute("aria-current");
        });
        if (title) title.textContent = slides[index].dataset.title || "";
    };

    const showSlide = async (index, animate = true) => {
        const nextIndex = (index + slides.length) % slides.length;
        if (nextIndex === currentIndex || isTransitioning) return;

        const currentSlide = slides[currentIndex];
        const nextSlide = slides[nextIndex];
        isTransitioning = true;
        nextSlide.classList.add("is-active");
        nextSlide.style.visibility = "visible";
        nextSlide.style.opacity = "1";
        updateControls(nextIndex);

        if (animate && typeof nextSlide.animate === "function") {
            const outgoing = currentSlide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: transitionMs, easing: "ease-in-out", fill: "forwards" });
            const incoming = nextSlide.animate([{ opacity: 0 }, { opacity: 1 }], { duration: transitionMs, easing: "ease-in-out", fill: "forwards" });
            await Promise.allSettled([outgoing.finished, incoming.finished]);
        }

        currentSlide.classList.remove("is-active");
        [currentSlide, nextSlide].forEach((slide) => {
            slide.style.removeProperty("opacity");
            slide.style.removeProperty("visibility");
        });
        currentIndex = nextIndex;
        isTransitioning = false;
    };

    const stopAutoPlay = () => { window.clearInterval(timerId); timerId = 0; };
    const startAutoPlay = () => {
        stopAutoPlay();
        timerId = window.setInterval(() => void showSlide(currentIndex + 1), intervalMs);
    };

    previousButton.addEventListener("click", () => { void showSlide(currentIndex - 1); startAutoPlay(); });
    nextButton.addEventListener("click", () => { void showSlide(currentIndex + 1); startAutoPlay(); });
    indicators.forEach((indicator) => indicator.addEventListener("click", () => {
        void showSlide(Number(indicator.dataset.slide));
        startAutoPlay();
    }));
    carousel.addEventListener("mouseenter", stopAutoPlay);
    carousel.addEventListener("mouseleave", startAutoPlay);
    carousel.addEventListener("focusin", stopAutoPlay);
    carousel.addEventListener("focusout", startAutoPlay);
    document.addEventListener("visibilitychange", () => document.hidden ? stopAutoPlay() : startAutoPlay());

    slides.forEach((slide, index) => slide.classList.toggle("is-active", index === 0));
    updateControls(0);
    startAutoPlay();
});
