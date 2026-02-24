// ============================================
// DAGESTAN DISCIPLINE - LANDING PAGE SCRIPTS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar background on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            nav.style.background = 'rgba(10, 10, 10, 0.95)';
            nav.style.backdropFilter = 'blur(10px)';
        } else {
            nav.style.background = 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)';
            nav.style.backdropFilter = 'none';
        }
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe all animatable elements
    document.querySelectorAll('.sport-card, .feature-row, .screenshot-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add visible class styles
    const style = document.createElement('style');
    style.textContent = `
        .visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Duplicate carousel items for infinite scroll
    const carousel = document.querySelector('.screenshots-carousel');
    if (carousel) {
        const items = carousel.innerHTML;
        carousel.innerHTML = items + items;
    }

    // Parallax effect for hero phone
    const heroPhone = document.querySelector('.hero-phone');
    if (heroPhone && window.innerWidth > 1024) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            heroPhone.style.transform = `translateY(calc(-50% + ${scrolled * 0.3}px))`;
        });
    }

    // Add stagger delay to sport cards
    document.querySelectorAll('.sport-card').forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.1}s`;
    });

    // Add stagger delay to feature rows
    document.querySelectorAll('.feature-row').forEach((row, index) => {
        row.style.transitionDelay = `${index * 0.15}s`;
    });

    console.log('⚔️ Dagestan Discipline - Train Like a Champion');
});

