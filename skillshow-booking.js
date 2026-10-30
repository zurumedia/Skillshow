
/* =====================================
   SKILLSHOW WHATSAPP BOOKING FEATURE
   ===================================== */

(() => {
  "use strict";

  const BUTTON = "[data-book-me]";

  function getBookingDetails(button) {
    const profile = button.closest(
      "[data-profile], .profile-container, #profile-container"
    );

    const phone = (
      button.dataset.whatsappNumber ||
      profile?.dataset.whatsappNumber ||
      button.dataset.phone ||
      profile?.dataset.phone ||
      ""
    ).replace(/\D/g, "");

    const name =
      button.dataset.bookingName ||
      profile?.dataset.bookingName ||
      profile?.querySelector("[data-profile-name]")?.textContent?.trim() ||
      profile?.querySelector(".profile-name, .username, h1, h2")?.textContent?.trim() ||
      "";

    return { phone, name };
  }

  function notify(message) {
    let notice = document.getElementById(
      "skillshow-booking-notice"
    );

    if (!notice) {
      notice = document.createElement("div");
      notice.id = "skillshow-booking-notice";

      notice.style.cssText = `
        position:fixed;
        bottom:25px;
        left:50%;
        transform:translateX(-50%);
        z-index:999999;
        background:#152642;
        color:white;
        border:1px solid #C9A86A;
        padding:13px 18px;
        border-radius:12px;
        font:14px system-ui;
        box-shadow:0 5px 25px #0005;
        max-width:90%;
        text-align:center;
      `;

      document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.hidden = false;

    clearTimeout(notice._timer);

    notice._timer = setTimeout(() => {
      notice.hidden = true;
    }, 3500);
  }

  function openBooking(button) {
    const { phone, name } = getBookingDetails(button);

    if (!phone) {
      notify("This creator has not added a WhatsApp booking number yet.");
      return;
    }

    if (phone.length < 10 || phone.length > 15) {
      notify("This WhatsApp number appears incorrect.");
      return;
    }

    const message =
      `Hello${name ? " " + name : ""}, I found your profile on SkillShow and would like to discuss booking your services.`;

    const url =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    const newWindow = window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

    if (!newWindow) {
      window.location.href = url;
    }
  }

  document.addEventListener("click", function(event) {
    const button = event.target.closest(BUTTON);

    if (!button) return;

    event.preventDefault();
    openBooking(button);
  });

  window.SkillShowBooking = {
    open: openBooking
  };

  console.info(
    "[SkillShow] WhatsApp Booking loaded successfully."
  );

})();
