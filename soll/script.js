console.log("✅ Counter script loaded");

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM fully loaded");

  const counters = document.querySelectorAll(".counter");
  const section = document.getElementById("section1");

  console.log("Section found:", section);
  console.log("Counters found:", counters.length);

  if (!section || counters.length === 0) {
    console.error("❌ Missing section or counters");
    return;
  }

  const duration = 3000; // smoother, slightly longer animation
  let triggered = false;

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function animate(counter) {
    const target = Number(counter.dataset.target);
    const suffix = counter.dataset.suffix || "";
    let start = null;

    function step(ts) {
      if (!start) start = ts;

      const progress = Math.min((ts - start) / duration, 1);
      const eased = easeOutQuad(progress);
      const value = eased * target;

      // Round only for display, updates every frame
      counter.textContent = Math.round(value).toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        counter.textContent = target.toLocaleString() + suffix;
      }
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        console.log("Intersection:", entry.isIntersecting);

        if (entry.isIntersecting && !triggered) {
          triggered = true;
          counters.forEach(counter => {
            counter.textContent = "0";
            animate(counter);
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(section);

  // Fallback scroll trigger
  window.addEventListener("scroll", () => {
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight && !triggered) {
      triggered = true;
      counters.forEach(counter => {
        animate(counter);
      });
    }
  });
});

// Mobile menu toggle
const hamburger = document.getElementById("hamburger");
const mobileMenu = document.getElementById("mobileMenu");

if (hamburger && mobileMenu) {
  hamburger.addEventListener("click", () => {
    mobileMenu.classList.toggle("show");
  });
}
