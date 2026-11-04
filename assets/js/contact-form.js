"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    const submitButton = document.getElementById("contact-submit");
    const status = document.getElementById("contact-status");
    const label = submitButton?.querySelector(".submit-label");
    const progress = submitButton?.querySelector(".submit-progress");
    const captcha = document.getElementById("contact-captcha");
    const captchaLabel = document.getElementById("contact-captcha-label");
    let captchaAnswer = 0;

    if (!form || !submitButton || !status || !label || !progress || !captcha || !captchaLabel) return;

    const generateCaptcha = () => {
        const first = Math.floor(Math.random() * 8) + 1;
        const second = Math.floor(Math.random() * 8) + 1;
        captchaAnswer = first + second;
        captchaLabel.textContent = `Verification: ${first}+${second}=`;
        captcha.value = "";
        captcha.setCustomValidity("");
    };

    const showStatus = (message, type) => {
        status.textContent = message;
        status.className = `alert alert-${type}`;
    };

    const setSending = (sending) => {
        submitButton.disabled = sending;
        label.classList.toggle("d-none", sending);
        progress.classList.toggle("d-none", !sending);
    };

    const validateCaptcha = () => {
        const value = Number(captcha.value);
        captcha.setCustomValidity(Number.isFinite(value) && value === captchaAnswer ? "" : "Incorrect answer");
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        validateCaptcha();
        form.classList.add("was-validated");

        if (!form.checkValidity()) {
            showStatus("Please complete all required fields and solve the verification question.", "danger");
            return;
        }

        setSending(true);
        showStatus("Sending your message...", "info");

        try {
            const ajaxUrl = form.action.replace("https://formsubmit.co/", "https://formsubmit.co/ajax/");
            const response = await fetch(ajaxUrl, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || result.success === "false") {
                throw new Error(result.message || `Submission failed with status ${response.status}`);
            }

            form.reset();
            form.classList.remove("was-validated");
            generateCaptcha();
            showStatus("Message sent successfully. Thank you!", "success");

        } catch (error) {
            console.error("Contact form submission failed:", error);
            const localFile = window.location.protocol === "file:";
            showStatus(localFile
                ? "Local file mode may block submission. Publish the page on GitHub Pages and try again."
                : "The message could not be sent. Please try again later or email us directly.", "danger");
            generateCaptcha();

        } finally {
            setSending(false);
        }
    });

    captcha.addEventListener("input", validateCaptcha);
    window.addEventListener("pageshow", generateCaptcha);
    generateCaptcha();
});
