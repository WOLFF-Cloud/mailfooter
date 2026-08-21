/* landing.js */
document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. STICKY HEADER SCROLL LOGIC
  // ==========================================
  const header = document.querySelector('.app-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // ==========================================
  // 2. MOBILE NAVIGATION DRAWER
  // ==========================================
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      
      // Animate hamburger icon
      const svg = navToggle.querySelector('svg');
      if (svg) {
        if (navMenu.classList.contains('active')) {
          svg.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
        } else {
          svg.innerHTML = '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>';
        }
      }
    });

    // Close menu when clicking link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const svg = navToggle.querySelector('svg');
        if (svg) {
          svg.innerHTML = '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>';
        }
      });
    });
  }

  // ==========================================
  // 3. HERO INTERACTIVE SIGNATURE PREVIEWER
  // ==========================================
  const demoNameInput = document.getElementById('demoName');
  const demoTitleInput = document.getElementById('demoTitle');
  const demoEmailInput = document.getElementById('demoEmail');
  const demoPhoneInput = document.getElementById('demoPhone');
  
  const displaySigName = document.getElementById('sigDemoName');
  const displaySigTitle = document.getElementById('sigDemoTitle');
  const displaySigEmail = document.getElementById('sigDemoEmail');
  const displaySigPhone = document.getElementById('sigDemoPhone');
  
  if (demoNameInput && displaySigName) {
    const updateDemoPreview = () => {
      displaySigName.textContent = demoNameInput.value.trim() || 'Lennon Arends';
      displaySigTitle.textContent = demoTitleInput.value.trim() || 'Software Engineer';
      
      const email = demoEmailInput.value.trim() || 'lennon@apexcorp.com';
      displaySigEmail.innerHTML = `<strong>E:</strong> ${email}`;
      
      const phone = demoPhoneInput.value.trim() || '011 234 5678';
      displaySigPhone.innerHTML = `<strong>T:</strong> ${phone}`;

      // Dynamically extract domain from email to update website preview
      let domain = 'apexcorp.com';
      if (email.includes('@')) {
        const parts = email.split('@');
        if (parts[1] && parts[1].trim().length > 3) {
          domain = parts[1].trim();
        }
      }
      const displaySigWeb = document.getElementById('sigDemoWeb');
      if (displaySigWeb) {
        displaySigWeb.innerHTML = `<strong>W:</strong> <a href="#" style="color: #666666; text-decoration: none;">www.${domain}</a>`;
      }
    };

    demoNameInput.addEventListener('input', updateDemoPreview);
    demoTitleInput.addEventListener('input', updateDemoPreview);
    demoEmailInput.addEventListener('input', updateDemoPreview);
    demoPhoneInput.addEventListener('input', updateDemoPreview);
  }

  // ==========================================
  // 4. INTERACTIVE PRICING CALCULATOR SLIDER
  // ==========================================
  const pricingSlider = document.getElementById('pricingSlider');
  const userCountLabel = document.getElementById('userCountLabel');
  
  // Tiers and pricing details
  const pricingTiers = [
    { maxUsers: 5, planId: 'starter', name: 'Starter Plan', priceZar: 1500, priceUsd: 85 },
    { maxUsers: 20, planId: 'team', name: 'Team Plan', priceZar: 2300, priceUsd: 130 },
    { maxUsers: 50, planId: 'enterprise', name: 'Enterprise Plan', priceZar: 4500, priceUsd: 250 },
    { maxUsers: 100, planId: 'custom', name: 'Custom Enterprise', priceZar: 0, priceUsd: 0 } // Custom over 50
  ];

  const planCards = document.querySelectorAll('.plan-card');
  const pricingCurrencyToggle = document.getElementById('currencyToggle');
  let currentCurrency = 'ZAR'; // ZAR or USD

  if (pricingSlider && userCountLabel) {
    const handleSliderUpdate = () => {
      const users = parseInt(pricingSlider.value);
      
      // Update label
      if (users >= 51) {
        userCountLabel.textContent = '50+ Users';
      } else {
        userCountLabel.textContent = `${users} User${users > 1 ? 's' : ''}`;
      }

      // Find selected tier
      let selectedTier = pricingTiers[0];
      for (const tier of pricingTiers) {
        if (users <= tier.maxUsers) {
          selectedTier = tier;
          break;
        }
      }
      if (users > 50) {
        selectedTier = pricingTiers[3];
      }

      // Highlight active plan card
      planCards.forEach(card => {
        card.classList.remove('highlighted');
        if (card.getAttribute('data-plan') === selectedTier.planId) {
          card.classList.add('highlighted');
        }
      });

      // Highlight active tick label
      const ticks = document.querySelectorAll('.slider-tick');
      ticks.forEach(tick => {
        tick.classList.remove('active');
        const minVal = parseInt(tick.getAttribute('data-min'));
        const maxVal = parseInt(tick.getAttribute('data-max'));
        if (users >= minVal && users <= maxVal) {
          tick.classList.add('active');
        }
      });
    };

    pricingSlider.addEventListener('input', handleSliderUpdate);

    // Click slider ticks to snap value
    const ticks = document.querySelectorAll('.slider-tick');
    ticks.forEach(tick => {
      tick.addEventListener('click', () => {
        const snapVal = parseInt(tick.getAttribute('data-snap'));
        pricingSlider.value = snapVal;
        handleSliderUpdate();
      });
    });

    // Currency Switcher toggler
    if (pricingCurrencyToggle) {
      pricingCurrencyToggle.addEventListener('change', () => {
        currentCurrency = pricingCurrencyToggle.checked ? 'USD' : 'ZAR';
        
        // Update currency labels
        const currencyDisplays = document.querySelectorAll('.toggle-label');
        currencyDisplays.forEach(label => {
          if (label.getAttribute('data-cur') === currentCurrency) {
            label.classList.add('active');
          } else {
            label.classList.remove('active');
          }
        });

        // Update pricing cards values
        planCards.forEach(card => {
          const planId = card.getAttribute('data-plan');
          const tier = pricingTiers.find(t => t.planId === planId);
          const priceValElement = card.querySelector('.plan-price');
          const currencyElement = card.querySelector('.plan-currency');
          
          if (tier && priceValElement && currencyElement) {
            if (tier.planId === 'custom') return; // Custom remains "Custom"
            
            if (currentCurrency === 'USD') {
              currencyElement.textContent = '$';
              priceValElement.textContent = tier.priceUsd.toLocaleString();
            } else {
              currencyElement.textContent = 'R';
              priceValElement.textContent = tier.priceZar.toLocaleString();
            }
          }
        });
      });
    }
  }

  // ==========================================
  // 5. ACCORDION FAQ LOGIC
  // ==========================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question-btn');
    const answerWrapper = item.querySelector('.faq-answer-wrapper');
    
    if (questionBtn && answerWrapper) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        
        // Close all other FAQs
        faqItems.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            const otherWrapper = otherItem.querySelector('.faq-answer-wrapper');
            if (otherWrapper) otherWrapper.style.maxHeight = null;
          }
        });

        // Toggle current FAQ
        item.classList.toggle('active');
        if (!isActive) {
          answerWrapper.style.maxHeight = answerWrapper.scrollHeight + 'px';
        } else {
          answerWrapper.style.maxHeight = null;
        }
      });
    }
  });

  // ==========================================
  // 6. LOGIN GLASSMORPHISM MODAL
  // ==========================================
  const loginTrigger = document.getElementById('loginBtn');
  const loginOverlay = document.getElementById('loginOverlay');
  const modalClose = document.getElementById('modalClose');
  const loginTabs = document.querySelectorAll('.login-tab-btn');
  const adminPasswordGroup = document.getElementById('adminPasswordGroup');
  const emailLabel = document.getElementById('emailInputLabel');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  let currentLoginRole = 'staff'; // staff or admin

  if (loginTrigger && loginOverlay && modalClose) {
    const openLoginModal = (e) => {
      if (e) e.preventDefault();
      loginOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      if (loginError) loginError.style.display = 'none';
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    };

    const closeLoginModal = () => {
      loginOverlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    loginTrigger.addEventListener('click', openLoginModal);
    modalClose.addEventListener('click', closeLoginModal);
    
    // Close modal by clicking background overlay
    loginOverlay.addEventListener('click', (e) => {
      if (e.target === loginOverlay) {
        closeLoginModal();
      }
    });

    // Tab switching: Staff vs Admin login layout
    loginTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        loginTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentLoginRole = tab.getAttribute('data-role');
        if (loginError) loginError.style.display = 'none';
        
        if (currentLoginRole === 'admin') {
          adminPasswordGroup.style.display = 'flex';
          emailLabel.textContent = 'Administrator Email';
          emailInput.placeholder = 'admin@company.com';
        } else {
          adminPasswordGroup.style.display = 'none';
          emailLabel.textContent = 'Work Email Address';
          emailInput.placeholder = 'name@company.com';
        }
      });
    });

    // Form submission simulated authentication logic
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (loginError) loginError.style.display = 'none';
        
        const emailVal = emailInput.value.trim();
        
        if (!emailVal) {
          loginError.textContent = 'Please enter your email address.';
          loginError.style.display = 'block';
          return;
        }

        const submitBtn = loginForm.querySelector('.login-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';

        if (currentLoginRole === 'admin') {
          const passwordVal = passwordInput.value.trim();
          if (!passwordVal) {
            loginError.textContent = 'Please enter your administrator password.';
            loginError.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
          }

          const API_DOMAIN = window.location.origin + window.location.pathname.replace(/\/(index|app|admin|super-admin|register)(\.html)?$/, '').replace(/\/$/, '');
          
          fetch(`${API_DOMAIN}/api/login.php`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: emailVal, password: passwordVal })
          })
          .then(res => {
            if (!res.ok) {
              return res.json().then(err => { throw new Error(err.error || 'Authentication failed'); });
            }
            return res.json();
          })
          .then(data => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            
            if (data.success) {
              if (data.role === 'superadmin') {
                sessionStorage.setItem('superadmin_logged_in', 'true');
                window.location.href = 'super-admin.html';
              } else {
                sessionStorage.setItem('admin_domain', data.domain);
                sessionStorage.setItem('admin_email', data.email);
                window.location.href = 'admin.html';
              }
            } else {
              loginError.textContent = data.error || 'Invalid administrator email or password.';
              loginError.style.display = 'block';
            }
          })
          .catch(err => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            loginError.textContent = err.message || 'Authentication server connection failed.';
            loginError.style.display = 'block';
          });
        } else {
          // Redirect to employee signature generator app
          setTimeout(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            window.location.href = `app.html?email=${encodeURIComponent(emailVal)}`;
          }, 800);
        }
      });
    }

    // Auto-open modal if URL contains login parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'admin') {
      openLoginModal();
      const adminTab = Array.from(loginTabs).find(t => t.getAttribute('data-role') === 'admin');
      if (adminTab) adminTab.click();
    } else if (urlParams.get('login') === 'superadmin') {
      openLoginModal();
      const adminTab = Array.from(loginTabs).find(t => t.getAttribute('data-role') === 'admin');
      if (adminTab) adminTab.click();
      if (emailInput) {
        emailInput.value = 'superadmin@mailfooter.com';
        emailInput.focus();
      }
    } else if (urlParams.has('login')) {
      openLoginModal();
    }
  }

  // ==========================================
  // 7. COMPANY REGISTRATION PAGE LOGIC
  // ==========================================
  const registerForm = document.getElementById('registerForm');
  const registerSuccessOverlay = document.getElementById('registerSuccessOverlay');
  const progressFill = document.getElementById('successProgressFill');
  const progressStatus = document.getElementById('successProgressStatus');
  
  // Registration parameters
  const planSelector = document.getElementById('registerPlan');
  const companyNameInput = document.getElementById('companyName');
  const companyDomainInput = document.getElementById('companyDomain');
  const adminNameInput = document.getElementById('adminName');
  const adminEmailInput = document.getElementById('adminEmail');
  const adminPhoneInput = document.getElementById('adminPhone');
  
  const selectedPlanName = document.getElementById('summaryPlanName');
  const selectedPlanUsers = document.getElementById('summaryPlanUsers');
  const selectedPlanPrice = document.getElementById('summaryPlanPrice');
  const selectedPlanCurrency = document.getElementById('summaryPlanCurrency');
  const planSummaryCard = document.getElementById('planSummaryCard');

  if (registerForm) {
    // Parse query params to select plan
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    
    let plansInfo = {
      starter: { name: 'Starter Plan', users: '1-5 Users Limit', price: '1,500', currency: 'R' },
      team: { name: 'Team Plan', users: '6-20 Users Limit', price: '2,300', currency: 'R' },
      enterprise: { name: 'Enterprise Plan', users: '21-50 Users Limit', price: '4,500', currency: 'R' },
      custom: { name: 'Custom Enterprise', users: 'Unlimited Users', price: 'Quote', currency: '' }
    };

    const updatePlanSummary = (planId) => {
      const info = plansInfo[planId];
      if (info && selectedPlanName) {
        selectedPlanName.textContent = info.name;
        selectedPlanUsers.textContent = info.users;
        selectedPlanPrice.textContent = info.price;
        selectedPlanCurrency.textContent = info.currency;
        
        if (planSummaryCard) {
          planSummaryCard.classList.add('highlighted');
        }
      }
    };

    const API_DOMAIN = window.location.origin + window.location.pathname.replace(/\/(index|app|admin|super-admin|register)(\.html)?$/, '').replace(/\/$/, '');
    
    // Load database configurations dynamically
    fetch(`${API_DOMAIN}/api/super_admin.php?action=price_plans`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.plans.length > 0) {
          plansInfo = {};
          if (planSelector) planSelector.innerHTML = '';
          
          data.plans.forEach(p => {
            const isCustom = p.plan_id === 'custom';
            plansInfo[p.plan_id] = {
              name: p.name,
              users: isCustom ? 'Unlimited Users' : `1-${p.max_users} Users Limit`,
              price: isCustom ? 'Quote' : p.price_zar_annual.toLocaleString(),
              currency: isCustom ? '' : 'R'
            };
            
            if (planSelector) {
              const opt = document.createElement('option');
              opt.value = p.plan_id;
              const displayPrice = isCustom ? 'Contact Sales' : `R${p.price_zar_annual.toLocaleString()}/year`;
              const displayUsers = isCustom ? '51+' : `1-${p.max_users}`;
              opt.textContent = `${p.name} (${displayUsers} Users) - ${displayPrice}`;
              planSelector.appendChild(opt);
            }
          });
          
          // Re-trigger pre-select or update
          if (planParam && plansInfo[planParam]) {
            if (planSelector) planSelector.value = planParam;
            updatePlanSummary(planParam);
          } else {
            updatePlanSummary('starter');
          }
        }
      })
      .catch(() => {});

    // Pre-select plan dropdown (initial placeholder)
    if (planParam && plansInfo[planParam]) {
      if (planSelector) {
        planSelector.value = planParam;
      }
      updatePlanSummary(planParam);
    } else {
      updatePlanSummary('starter');
    }

    if (planSelector) {
      planSelector.addEventListener('change', () => {
        updatePlanSummary(planSelector.value);
      });
    }

    // Helper to validate email syntax
    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // Helper to validate domain syntax (e.g. company.com or company.co.za)
    const isValidDomain = (domain) => {
      return /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(domain);
    };

    // Form submission and success state transition
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const registerError = document.getElementById('registerError');
      if (registerError) registerError.style.display = 'none';

      // Validation
      const companyName = companyNameInput.value.trim();
      const companyDomain = companyDomainInput.value.trim();
      const adminName = adminNameInput.value.trim();
      const adminEmail = adminEmailInput.value.trim();
      
      if (!companyName || !companyDomain || !adminName || !adminEmail) {
        showRegisterError('All fields marked with an asterisk (*) are required.');
        return;
      }

      if (!isValidDomain(companyDomain)) {
        showRegisterError('Please enter a valid company domain (e.g. yourcompany.co.za or company.com).');
        return;
      }

      if (!isValidEmail(adminEmail)) {
        showRegisterError('Please enter a valid work email address.');
        return;
      }

      // Hide register submit button and show overlay animation
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      setTimeout(() => {
        // Trigger overlay success
        registerSuccessOverlay.classList.add('active');
        
        // Setup sequence loading bar simulation
        const loadingSteps = [
          { percentage: 20, status: 'Creating tenant account...' },
          { percentage: 50, status: 'Provisioning SQL database...' },
          { percentage: 80, status: 'Generating admin profile token...' },
          { percentage: 100, status: 'Deployment ready! Redirecting...' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
          if (currentStep < loadingSteps.length) {
            const step = loadingSteps[currentStep];
            progressFill.style.width = step.percentage + '%';
            progressStatus.textContent = step.status;
            currentStep++;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              // Redirect to admin.html for setup
              window.location.href = 'admin.html';
            }, 1000);
          }
        }, 1000);

      }, 1000);
    });

    const showRegisterError = (msg) => {
      let errDiv = document.getElementById('registerError');
      if (!errDiv) {
        errDiv = document.createElement('div');
        errDiv.id = 'registerError';
        errDiv.className = 'form-error-msg';
        errDiv.style.gridColumn = 'span 2';
        errDiv.style.display = 'block';
        errDiv.style.marginBottom = '15px';
        registerForm.insertBefore(errDiv, registerForm.firstChild);
      } else {
        errDiv.style.display = 'block';
      }
      errDiv.textContent = msg;
      errDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }
});
