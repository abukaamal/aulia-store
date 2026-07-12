import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { 
  Product, 
  CarouselSlide, 
  AboutItem, 
  ContactInfo, 
  GalleryItem, 
  FooterData, 
  CartItem 
} from './types';

// Declare Midtrans Snap global variable
declare const snap: any;

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFtZ0FEN-ljWl4EYEpIHQcy6AgCFxfGVJT0m6izM2hxY4YiRjozmrIMR2GhJrW4upWYA/exec';

export default function App() {
  // ==================== APP STATE ====================
  const [currentPage, setCurrentPage] = useState<'home' | 'products' | 'gallery' | 'about' | 'contact'>('home');
  const [products, setProducts] = useState<Product[]>([]);
  const [carousels, setCarousels] = useState<CarouselSlide[]>([]);
  const [abouts, setAbouts] = useState<AboutItem[]>([]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [galleries, setGalleries] = useState<GalleryItem[]>([]);
  const [footer, setFooter] = useState<FooterData | null>(null);
  const [storeName, setStoreName] = useState<string>('Aulia Store');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [galleryCategory, setGalleryCategory] = useState<string>('all');
  
  // Modals & UI states
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFadeOut, setLoadingFadeOut] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutProgress, setCheckoutProgress] = useState<number>(0);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [hamburgerActive, setHamburgerActive] = useState<boolean>(false);
  const [lightbox, setLightbox] = useState<{ imageUrl: string, title: string, description: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    note: ''
  });

  // Validation feedback states
  const [validation, setValidation] = useState({
    name: { visited: false, valid: false },
    email: { visited: false, valid: false },
    phone: { visited: false, valid: false },
    address: { visited: false, valid: false }
  });

  const [csrfToken, setCsrfToken] = useState<string>('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const lastRequestTimeRef = useRef<number>(0);
  const autoSlideIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== CSRF & RATE LIMIT ====================
  const generateCSRFToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('csrf_token', token);
    setCsrfToken(token);
    return token;
  };

  const canMakeRequest = () => {
    const now = Date.now();
    if (now - lastRequestTimeRef.current < 2000) {
      return false;
    }
    lastRequestTimeRef.current = now;
    return true;
  };

  // ==================== INITIAL LOAD ====================
  useEffect(() => {
    // Generate CSRF
    const existingToken = sessionStorage.getItem('csrf_token');
    if (existingToken) {
      setCsrfToken(existingToken);
    } else {
      generateCSRFToken();
    }

    // Load data from all endpoints
    const loadAllData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchCarousel(),
          fetchAbout(),
          fetchContact(),
          fetchGallery(),
          fetchFooterAndLogo()
        ]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        // Trigger fade out
        setLoadingFadeOut(true);
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    };

    loadAllData();

    // Event listener for Escape keys & window resizing
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightbox(null);
        setCartOpen(false);
        setHamburgerActive(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setHamburgerActive(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
      if (loadingProgressIntervalRef.current) clearInterval(loadingProgressIntervalRef.current);
    };
  }, []);

  // ==================== FETCH CALLS ====================
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=products`);
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch (e) {
      console.warn('Failed fetching products:', e);
    }
  };

  const fetchCarousel = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=home`);
      const data = await res.json();
      if (data.success && data.carousels) {
        setCarousels(data.carousels);
      }
    } catch (e) {
      console.warn('Failed fetching carousel:', e);
    }
  };

  const fetchAbout = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=about`);
      const data = await res.json();
      if (data.success && data.abouts) {
        setAbouts(data.abouts);
      }
    } catch (e) {
      console.warn('Failed fetching about:', e);
    }
  };

  const fetchContact = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=contact`);
      const data = await res.json();
      if (data.success && data.contacts && data.contacts.length > 0) {
        setContact(data.contacts[0]);
      }
    } catch (e) {
      console.warn('Failed fetching contact:', e);
    }
  };

  const fetchGallery = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=gallery`);
      const data = await res.json();
      if (data.success && data.galleries) {
        setGalleries(data.galleries);
      }
    } catch (e) {
      console.warn('Failed fetching gallery:', e);
    }
  };

  const fetchFooterAndLogo = async () => {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?type=footer`);
      const data = await res.json();
      if (data.success && data.footer) {
        setFooter(data.footer);
        if (data.footer.storeName) {
          setStoreName(data.footer.storeName);
          document.title = `${data.footer.storeName} - Toko Online`;
        }
      }
    } catch (e) {
      console.warn('Failed fetching footer:', e);
    }
  };

  // ==================== AUTO SLIDE EFFECT ====================
  useEffect(() => {
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
      autoSlideIntervalRef.current = null;
    }
    
    if (carousels.length > 1 && currentPage === 'home') {
      autoSlideIntervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carousels.length);
      }, 5000);
    }

    return () => {
      if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
    };
  }, [carousels, currentPage]);

  // ==================== SLIDER FUNCTIONS ====================
  const handlePrevSlide = () => {
    if (carousels.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + carousels.length) % carousels.length);
  };

  const handleNextSlide = () => {
    if (carousels.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % carousels.length);
  };

  const handleGoToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // ==================== FORM VALIDATIONS ====================
  const handleNameChange = (val: string) => {
    const sanitized = val.replace(/[<>]/g, '');
    const valid = sanitized.length >= 3 && /^[a-zA-Z\s.'-]+$/.test(sanitized);
    setFormData(prev => ({ ...prev, name: sanitized }));
    setValidation(prev => ({ ...prev, name: { visited: true, valid } }));
  };

  const handleEmailChange = (val: string) => {
    const clean = val.trim().toLowerCase();
    const gmailRegex = /^[a-z0-9][a-z0-9._]*[a-z0-9]@gmail\.com$/i;
    const valid = gmailRegex.test(clean);
    setFormData(prev => ({ ...prev, email: clean }));
    setValidation(prev => ({ ...prev, email: { visited: true, valid } }));
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.trim().replace(/[\s\-\(\)]/g, '');
    const indonesiaRegex = /^(?:(?:\+62|62|0)(?:\d{9,13}))$/;
    let hasValidPrefix = clean.startsWith('08') || clean.startsWith('+628') || clean.startsWith('628');
    if (clean.startsWith('0') && !clean.startsWith('08')) {
      hasValidPrefix = false;
    }
    if (clean.startsWith('+62') || clean.startsWith('62')) {
      const afterPrefix = clean.replace(/^(\+62|62)/, '');
      if (afterPrefix.length < 8 || afterPrefix.length > 13 || !/^\d+$/.test(afterPrefix)) {
        hasValidPrefix = false;
      }
    }
    const isValidLength = clean.length >= 10 && clean.length <= 15;
    const valid = indonesiaRegex.test(clean) && hasValidPrefix && isValidLength;
    setFormData(prev => ({ ...prev, phone: val }));
    setValidation(prev => ({ ...prev, phone: { visited: true, valid } }));
  };

  const handleAddressChange = (val: string) => {
    const trimmed = val.trim();
    const valid = trimmed.length >= 10 && trimmed.length <= 500;
    setFormData(prev => ({ ...prev, address: val }));
    setValidation(prev => ({ ...prev, address: { visited: true, valid } }));
  };

  const handleNoteChange = (val: string) => {
    if (val.length <= 200) {
      setFormData(prev => ({ ...prev, note: val }));
    }
  };

  const formatPhoneNumber = (phone: string) => {
    let clean = phone.replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('0')) {
      clean = '+62' + clean.substring(1);
    } else if (clean.startsWith('62') && !clean.startsWith('+62')) {
      clean = '+' + clean;
    } else if (!clean.startsWith('+')) {
      clean = '+62' + clean;
    }
    return clean;
  };

  // ==================== CART ACTIONS ====================
  const addToCart = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const stock = product.stock || 0;
    const existingItem = cart.find(item => item.id === productId);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (currentQty + 1 > stock) {
      Swal.fire('Stok Habis', `Stok ${product.name} tidak mencukupi! Tersisa ${stock} item.`, 'warning');
      return;
    }

    if (existingItem) {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart(prev => [...prev, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl
      }]);
    }

    if (navigator.vibrate) navigator.vibrate(10);

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: `${product.name} ditambahkan ke keranjang`,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  };

  const updateQuantity = (productId: number, change: number) => {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    const product = products.find(p => p.id === productId);
    const newQty = item.quantity + change;

    if (newQty <= 0) {
      removeFromCart(productId);
    } else if (product && newQty <= (product.stock || 0)) {
      setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: newQty } : item));
    } else {
      Swal.fire('Stok Habis', `Stok tidak mencukupi! Maksimal ${product?.stock || 0} item.`, 'warning');
    }
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const resetCheckoutForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      note: ''
    });
    setValidation({
      name: { visited: false, valid: false },
      email: { visited: false, valid: false },
      phone: { visited: false, valid: false },
      address: { visited: false, valid: false }
    });
    setIsProcessingCheckout(false);
  };

  // ==================== CHECKOUT FLOW ====================
  const handleCheckout = async () => {
    if (isProcessingCheckout) return;
    if (!canMakeRequest()) {
      Swal.fire('Terlalu Cepat', 'Harap tunggu beberapa saat sebelum melakukan checkout lagi', 'warning');
      return;
    }

    // Force validation trigger
    const finalValidName = formData.name.trim().length >= 3 && /^[a-zA-Z\s.'-]+$/.test(formData.name.trim());
    const finalValidEmail = /^[a-z0-9][a-z0-9._]*[a-z0-9]@gmail\.com$/i.test(formData.email.trim().toLowerCase());
    const cleanPhone = formData.phone.trim().replace(/[\s\-\(\)]/g, '');
    const finalValidPhone = /^(?:(?:\+62|62|0)(?:\d{9,13}))$/.test(cleanPhone) && 
                            (cleanPhone.startsWith('08') || cleanPhone.startsWith('+628') || cleanPhone.startsWith('628')) &&
                            cleanPhone.length >= 10 && cleanPhone.length <= 15;
    const finalValidAddress = formData.address.trim().length >= 10 && formData.address.trim().length <= 500;

    setValidation({
      name: { visited: true, valid: finalValidName },
      email: { visited: true, valid: finalValidEmail },
      phone: { visited: true, valid: finalValidPhone },
      address: { visited: true, valid: finalValidAddress }
    });

    if (cart.length === 0) {
      Swal.fire('Keranjang Kosong', 'Silakan tambahkan produk terlebih dahulu', 'warning');
      return;
    }
    if (!finalValidName) {
      Swal.fire('Nama Tidak Valid', 'Nama harus minimal 3 karakter', 'error');
      return;
    }
    if (!finalValidEmail) {
      Swal.fire('Email Tidak Valid', 'Harus menggunakan email Gmail (@gmail.com)', 'error');
      return;
    }
    if (!finalValidPhone) {
      Swal.fire('Nomor Telepon Tidak Valid', 'Gunakan format nomor Indonesia', 'error');
      return;
    }
    if (!finalValidAddress) {
      Swal.fire('Alamat Tidak Valid', 'Alamat harus minimal 10 karakter dan maksimal 500 karakter', 'error');
      return;
    }

    // Begin processing
    setIsProcessingCheckout(true);
    setCheckoutLoading(true);
    setCheckoutProgress(0);

    // Animate fake progress bar
    if (loadingProgressIntervalRef.current) clearInterval(loadingProgressIntervalRef.current);
    loadingProgressIntervalRef.current = setInterval(() => {
      setCheckoutProgress(prev => {
        const inc = Math.random() * 15;
        return prev + inc > 95 ? 95 : prev + inc;
      });
    }, 300);

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formatPhoneNumber(formData.phone.trim());
    const address = formData.address.trim();
    const note = formData.note.trim();
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const payload = {
      action: 'checkout',
      customer: { name, email, phone, address, note },
      items: cart,
      totalAmount,
      csrf_token: csrfToken
    };

    const scriptFormData = new FormData();
    scriptFormData.append('payload', JSON.stringify(payload));

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: scriptFormData
      });
      const result = await response.json();

      // Clear fake progress animation
      if (loadingProgressIntervalRef.current) {
        clearInterval(loadingProgressIntervalRef.current);
        loadingProgressIntervalRef.current = null;
      }
      setCheckoutProgress(100);

      // Hide loading screen after 300ms so transition is visible
      setTimeout(() => {
        setCheckoutLoading(false);
        if (result.success && result.snapToken) {
          // Open Midtrans Snap Popup
          snap.pay(result.snapToken, {
            onSuccess: (r: any) => {
              setIsProcessingCheckout(false);
              confirmPayment(r.order_id, r.transaction_id, 'success');
            },
            onError: () => {
              setIsProcessingCheckout(false);
              Swal.fire('Pembayaran Gagal', 'Terjadi kesalahan saat pembayaran', 'error');
            },
            onClose: () => {
              setIsProcessingCheckout(false);
              Swal.fire('Pembayaran Dibatalkan', 'Anda membatalkan pembayaran', 'info');
            }
          });
        } else {
          setIsProcessingCheckout(false);
          Swal.fire('Checkout Gagal', result.message || 'Terjadi kesalahan', 'error');
        }
      }, 500);

    } catch (error) {
      if (loadingProgressIntervalRef.current) clearInterval(loadingProgressIntervalRef.current);
      setCheckoutLoading(false);
      setIsProcessingCheckout(false);
      console.error('Checkout error:', error);
      Swal.fire('Error', 'Terjadi kesalahan saat checkout!', 'error');
    }
  };

  const confirmPayment = async (orderId: string, transactionId: string, status: string) => {
    const payload = {
      action: 'confirm',
      orderId,
      transactionId,
      status,
      items: cart.map(item => ({
        id: item.id,
        quantity: item.quantity
      })),
      csrf_token: csrfToken
    };

    const scriptFormData = new FormData();
    scriptFormData.append('payload', JSON.stringify(payload));

    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: scriptFormData
      });
      const result = await response.json();

      if (result.success) {
        setCart([]);
        setCartOpen(false);
        resetCheckoutForm();
        fetchProducts(); // Refresh products with updated stock
        Swal.fire({
          icon: 'success',
          title: 'Pembayaran Berhasil!',
          text: 'Pesanan Anda sedang diproses. Terima kasih telah berbelanja!',
          confirmButtonColor: '#27ae60'
        });
      } else {
        Swal.fire('Error', 'Gagal mengkonfirmasi pembayaran', 'error');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Terjadi kesalahan saat konfirmasi', 'error');
    }
  };

  // ==================== NAV ACTIONS ====================
  const handleShowPage = (pageName: 'home' | 'products' | 'gallery' | 'about' | 'contact') => {
    setCurrentPage(pageName);
    setHamburgerActive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCart = () => {
    setCartOpen(true);
    setHamburgerActive(false);
  };

  // ==================== UI STATE COHERENCE ====================
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isFormValid = validation.name.valid && validation.email.valid && validation.phone.valid && validation.address.valid;

  // Filter gallery items
  const filteredGalleries = galleryCategory === 'all' 
    ? galleries 
    : galleries.filter(g => g.category === galleryCategory);

  const galleryCategories = ['all', ...Array.from(new Set(galleries.map(g => g.category).filter(Boolean)))];

  return (
    <>
      {/* ==================== LOADING SCREEN ==================== */}
      {loading && (
        <div id="loadingScreen" className={loadingFadeOut ? 'hidden' : ''}>
          <div className="loader"></div>
          <p>Memuat {storeName}...</p>
        </div>
      )}

      {/* ==================== CHECKOUT LOADING OVERLAY ==================== */}
      <div id="checkoutLoadingOverlay" className={checkoutLoading ? 'active' : ''}>
        <div className="checkout-loader"></div>
        <p>⏳ Memproses Pesanan Anda...</p>
        <div className="loading-progress">
          <div 
            className="loading-progress-bar" 
            style={{ width: `${checkoutProgress}%` }}
          ></div>
        </div>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.7 }}>Mohon tunggu sebentar</p>
      </div>

      {/* ==================== NAVBAR ==================== */}
      <nav className="navbar" role="navigation" aria-label="Navigasi Utama">
        <div className="nav-container">
          <button 
            className={`hamburger ${hamburgerActive ? 'active' : ''}`} 
            onClick={() => setHamburgerActive(!hamburgerActive)} 
            aria-label="Toggle menu" 
            aria-expanded={hamburgerActive}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div 
            className="logo" 
            onClick={() => handleShowPage('home')} 
            role="button" 
            tabIndex={0} 
            aria-label="Beranda"
          >
            {storeName}
          </div>

          <div className={`nav-menu ${hamburgerActive ? 'active' : ''}`} role="menubar">
            <ul className="nav-links" role="menu">
              <li role="none">
                <a role="menuitem" onClick={() => handleShowPage('home')}>
                  <i className="fas fa-home" aria-hidden="true"></i> Home
                </a>
              </li>
              <li role="none">
                <a role="menuitem" onClick={() => handleShowPage('products')}>
                  <i className="fas fa-box" aria-hidden="true"></i> Produk
                </a>
              </li>
              <li role="none">
                <a role="menuitem" onClick={() => handleShowPage('gallery')}>
                  <i className="fas fa-images" aria-hidden="true"></i> Galeri
                </a>
              </li>
              <li role="none">
                <a role="menuitem" onClick={() => handleShowPage('about')}>
                  <i className="fas fa-info-circle" aria-hidden="true"></i> Tentang
                </a>
              </li>
              <li role="none">
                <a role="menuitem" onClick={() => handleShowPage('contact')}>
                  <i className="fas fa-envelope" aria-hidden="true"></i> Kontak
                </a>
              </li>
            </ul>
          </div>

          <div 
            className="cart-icon" 
            onClick={handleOpenCart} 
            role="button" 
            tabIndex={0} 
            aria-label="Keranjang Belanja"
          >
            <i className="fas fa-shopping-cart" aria-hidden="true"></i>
            {totalCartCount > 0 && (
              <span className="cart-count" aria-live="polite">
                {totalCartCount}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div 
        className={`mobile-overlay ${hamburgerActive ? 'active' : ''}`} 
        onClick={() => setHamburgerActive(false)}
      ></div>

      {/* ==================== MAIN CONTAINER ==================== */}
      <main className="container">
        
        {/* HOME PAGE */}
        <section id="homePage" className={`page ${currentPage === 'home' ? 'active' : ''}`} aria-label="Beranda">
          <div className="carousel-container" aria-label="Slider">
            <div 
              className="carousel-slides" 
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {carousels.length === 0 ? (
                <div className="carousel-slide">
                  <div className="carousel-skeleton">
                    <i className="fas fa-image"></i>
                  </div>
                  <div className="carousel-caption">
                    <h3>Selamat Datang di {storeName}</h3>
                    <p>Temukan produk terbaik kami</p>
                  </div>
                </div>
              ) : (
                carousels.map((slide, idx) => (
                  <div className="carousel-slide" key={idx}>
                    <div 
                      className="carousel-slide-bg" 
                      style={{ backgroundImage: `url(${slide.imageUrl})` }}
                    ></div>
                    <img 
                      className="carousel-slide-img"
                      src={slide.imageUrl} 
                      alt={slide.title || 'Slide'} 
                      loading="lazy" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.innerHTML = '<div class="carousel-skeleton"><i class="fas fa-image"></i></div>';
                        }
                      }}
                    />
                    <div className="carousel-caption">
                      <h3>{slide.title || ''}</h3>
                      <p>{slide.caption || ''}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {carousels.length > 1 && (
              <>
                <button 
                  className="carousel-btn prev" 
                  onClick={handlePrevSlide} 
                  aria-label="Slide sebelumnya"
                >
                  <i className="fas fa-chevron-left" aria-hidden="true"></i>
                </button>
                <button 
                  className="carousel-btn next" 
                  onClick={handleNextSlide} 
                  aria-label="Slide berikutnya"
                >
                  <i className="fas fa-chevron-right" aria-hidden="true"></i>
                </button>
                
                <div className="carousel-dots">
                  {carousels.map((_, idx) => (
                    <span 
                      key={idx} 
                      className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`} 
                      onClick={() => handleGoToSlide(idx)} 
                      role="button" 
                      aria-label={`Slide ${idx + 1}`}
                    ></span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* PRODUCTS PAGE */}
        <section id="productsPage" className={`page ${currentPage === 'products' ? 'active' : ''}`} aria-label="Produk">
          <h2 className="section-title">
            <i className="fas fa-box-open" aria-hidden="true"></i> Produk Kami
          </h2>
          <div className="products-grid">
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'white', gridColumn: '1 / -1' }}>
                <i className="fas fa-box-open" aria-hidden="true"></i> Belum ada produk
              </div>
            ) : (
              products.map((p) => {
                const stock = p.stock || 0;
                let stockClass = '';
                let stockText = <><i className="fas fa-boxes" aria-hidden="true"></i> Stok: {stock}</>;
                
                if (stock === 0) {
                  stockClass = 'out-stock';
                  stockText = <><i className="fas fa-times-circle" aria-hidden="true"></i> Stok Habis</>;
                } else if (stock < 10) {
                  stockClass = 'low-stock';
                  stockText = <><i className="fas fa-exclamation-triangle" aria-hidden="true"></i> Stok: {stock} (Segera Habis)</>;
                }

                return (
                  <div className="product-card" key={p.id}>
                    <img 
                      className="product-image" 
                      src={p.imageUrl || 'https://via.placeholder.com/300'} 
                      alt={p.name} 
                      loading="lazy" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300';
                      }}
                    />
                    <div className="product-info">
                      <div className="product-name">{p.name}</div>
                      <div className="product-desc">{p.description || ''}</div>
                      <div className="product-price">
                        <i className="fas fa-tag" aria-hidden="true"></i> Rp {new Intl.NumberFormat('id-ID').format(p.price)}
                      </div>
                      <div className={`product-stock ${stockClass}`}>{stockText}</div>
                      <button 
                        className="add-to-cart" 
                        onClick={() => addToCart(p.id)} 
                        disabled={stock === 0}
                      >
                        <i className="fas fa-cart-plus" aria-hidden="true"></i> Tambah ke Keranjang
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* GALLERY PAGE */}
        <section id="galleryPage" className={`page ${currentPage === 'gallery' ? 'active' : ''}`} aria-label="Galeri">
          <h2 className="section-title">
            <i className="fas fa-images" aria-hidden="true"></i> Galeri Foto
          </h2>
          <div className="filter-buttons" role="tablist">
            {galleryCategories.map((cat) => (
              <button 
                key={cat || 'all'}
                className={`filter-btn ${galleryCategory === cat ? 'active' : ''}`} 
                onClick={() => setGalleryCategory(cat || 'all')}
                role="tab" 
                aria-selected={galleryCategory === cat}
              >
                {cat === 'all' ? 'Semua' : cat}
              </button>
            ))}
          </div>
          
          <div className="gallery-grid">
            {filteredGalleries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'white', gridColumn: '1 / -1' }}>
                Belum ada gambar di galeri
              </div>
            ) : (
              filteredGalleries.map((g, idx) => (
                <div 
                  className="gallery-item" 
                  key={idx}
                  onClick={() => setLightbox({
                    imageUrl: g.imageUrl,
                    title: g.title,
                    description: g.description || ''
                  })}
                >
                  <img 
                    src={g.imageUrl} 
                    alt={g.title} 
                    loading="lazy" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400';
                    }}
                  />
                  <div className="gallery-info">
                    <h3>{g.title}</h3>
                    <p>{g.description || ''}</p>
                    <span className="gallery-category">{g.category || 'Umum'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ABOUT PAGE */}
        <section id="aboutPage" className={`page ${currentPage === 'about' ? 'active' : ''}`} aria-label="Tentang Kami">
          <h2 className="section-title">
            <i className="fas fa-store" aria-hidden="true"></i> Tentang Kami
          </h2>
          <div className="about-grid">
            {abouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'white', gridColumn: '1 / -1' }}>
                <i className="fas fa-info-circle" aria-hidden="true"></i> Tidak ada informasi
              </div>
            ) : (
              abouts.map((a, idx) => (
                <div className="about-card" key={idx}>
                  <img 
                    src={a.imageUrl || 'https://via.placeholder.com/600x400'} 
                    alt={a.title} 
                    loading="lazy" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400';
                    }}
                  />
                  <div className="about-card-content">
                    <h2><i className="fas fa-angle-right" aria-hidden="true"></i> {a.title}</h2>
                    <p>{a.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* CONTACT PAGE */}
        <section id="contactPage" className={`page ${currentPage === 'contact' ? 'active' : ''}`} aria-label="Kontak">
          <h2 className="section-title">
            <i className="fas fa-address-card" aria-hidden="true"></i> Kontak Kami
          </h2>
          <div className="contact-wrapper">
            {!contact ? (
              <div className="contact-info-section" style={{ gridColumn: '1 / -1' }}>
                <p>Tidak ada informasi kontak</p>
              </div>
            ) : (
              <>
                <div className="contact-info-section">
                  <h3><i className="fas fa-map-marker-alt" aria-hidden="true"></i> Informasi Kontak</h3>
                  <div className="contact-details">
                    <div className="contact-detail-item">
                      <i className="fas fa-phone-alt" aria-hidden="true"></i>
                      <div className="contact-detail-text">
                        <h4>Telepon</h4>
                        <p><a href={`tel:${contact.phone}`}>{contact.phone}</a></p>
                      </div>
                    </div>
                    <div className="contact-detail-item">
                      <i className="fas fa-envelope" aria-hidden="true"></i>
                      <div className="contact-detail-text">
                        <h4>Email</h4>
                        <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
                      </div>
                    </div>
                    <div className="contact-detail-item">
                      <i className="fas fa-building" aria-hidden="true"></i>
                      <div className="contact-detail-text">
                        <h4>Alamat</h4>
                        <p>{contact.address}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="map-section">
                  {contact.mapUrl ? (
                    <iframe 
                      src={contact.mapUrl} 
                      allowFullScreen 
                      loading="lazy" 
                      title="Peta Lokasi"
                    ></iframe>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Peta tidak tersedia
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

      </main>

      {/* ==================== LIGHTBOX MODAL ==================== */}
      {lightbox && (
        <div 
          id="lightboxModal" 
          className="lightbox-modal active" 
          onClick={() => setLightbox(null)} 
          role="dialog" 
          aria-label="Lightbox"
        >
          <span 
            className="close-lightbox" 
            onClick={() => setLightbox(null)} 
            role="button" 
            aria-label="Tutup"
          >
            &times;
          </span>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              id="lightboxImage" 
              src={lightbox.imageUrl} 
              alt={lightbox.title} 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400';
              }}
            />
          </div>
          <div className="lightbox-caption">
            <strong>{lightbox.title}</strong><br />{lightbox.description}
          </div>
        </div>
      )}

      {/* ==================== CART MODAL ==================== */}
      {cartOpen && (
        <div 
          id="cartModal" 
          className="modal active" 
          onClick={() => setCartOpen(false)}
          role="dialog" 
          aria-label="Keranjang Belanja"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <i className="fas fa-shopping-cart" aria-hidden="true"></i> Keranjang Belanja
              </h2>
              <span 
                className="close-modal" 
                onClick={() => setCartOpen(false)} 
                role="button" 
                aria-label="Tutup keranjang"
              >
                &times;
              </span>
            </div>

            <div id="cartItems">
              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '1rem' }}>
                  <i className="fas fa-shopping-cart" aria-hidden="true"></i> Keranjang kosong
                </p>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <img 
                      src={item.imageUrl || 'https://via.placeholder.com/150'} 
                      alt={item.name} 
                      className="cart-item-thumbnail"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                      }}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">
                        <i className="fas fa-box" aria-hidden="true"></i> {item.name}
                      </div>
                      <div className="cart-item-price">
                        <i className="fas fa-tag" aria-hidden="true"></i> Rp {new Intl.NumberFormat('id-ID').format(item.price)}
                      </div>
                    </div>
                    <div className="cart-item-quantity">
                      <button 
                        className="quantity-btn" 
                        onClick={() => updateQuantity(item.id, -1)} 
                        aria-label="Kurangi jumlah"
                      >
                        <i className="fas fa-minus" aria-hidden="true"></i>
                      </button>
                      <span>{item.quantity}</span>
                      <button 
                        className="quantity-btn" 
                        onClick={() => updateQuantity(item.id, 1)} 
                        aria-label="Tambah jumlah"
                      >
                        <i className="fas fa-plus" aria-hidden="true"></i>
                      </button>
                      <button 
                        className="quantity-btn" 
                        onClick={() => removeFromCart(item.id)} 
                        style={{ background: '#e74c3c', color: 'white' }} 
                        aria-label="Hapus item"
                      >
                        <i className="fas fa-trash" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-total" id="cartTotal">
              <i className="fas fa-calculator" aria-hidden="true"></i> Total: Rp {new Intl.NumberFormat('id-ID').format(totalAmount)}
            </div>

            {/* CHECKOUT FORM */}
            <div className={`checkout-form ${cart.length === 0 || isProcessingCheckout ? 'hidden' : ''}`} id="checkoutForm">
              <h3><i className="fas fa-truck" aria-hidden="true"></i> Informasi Pengiriman</h3>

              {/* Nama Lengkap */}
              <div className="form-group">
                <input 
                  type="text" 
                  id="customerName" 
                  placeholder="Nama Lengkap" 
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={validation.name.visited ? (validation.name.valid ? 'valid' : 'invalid') : ''}
                  required 
                  aria-required="true" 
                />
                <div className={`error-message ${validation.name.visited && !validation.name.valid ? 'show' : ''}`} id="nameError">
                  Nama harus minimal 3 karakter (hanya huruf, spasi, titik, koma, strip)
                </div>
                <div className={`valid-message ${validation.name.visited && validation.name.valid ? 'show' : ''}`} id="nameValid">
                  ✓ Nama valid
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <input 
                  type="email" 
                  id="customerEmail" 
                  placeholder="Email (Gmail)" 
                  value={formData.email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={validation.email.visited ? (validation.email.valid ? 'valid' : 'invalid') : ''}
                  required 
                  aria-required="true" 
                />
                <div className={`error-message ${validation.email.visited && !validation.email.valid ? 'show' : ''}`} id="emailError">
                  Harus menggunakan email Gmail (@gmail.com)
                </div>
                <div className={`valid-message ${validation.email.visited && validation.email.valid ? 'show' : ''}`} id="emailValid">
                  ✓ Email Gmail valid
                </div>
              </div>

              {/* Nomor Telepon */}
              <div className="form-group">
                <input 
                  type="tel" 
                  id="customerPhone" 
                  placeholder="No. Telepon (contoh: 081234567890)" 
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={validation.phone.visited ? (validation.phone.valid ? 'valid' : 'invalid') : ''}
                  required 
                  aria-required="true" 
                />
                <div className={`error-message ${validation.phone.visited && !validation.phone.valid ? 'show' : ''}`} id="phoneError">
                  Nomor telepon tidak valid. Gunakan format Indonesia (08xx atau +62xx)
                </div>
                <div className={`valid-message ${validation.phone.visited && validation.phone.valid ? 'show' : ''}`} id="phoneValid">
                  ✓ Nomor telepon valid
                </div>
              </div>

              {/* ALAMAT LENGKAP */}
              <div className="form-group">
                <textarea 
                  id="customerAddress" 
                  placeholder="Alamat Lengkap (Jalan, RT/RW, Kelurahan, Kecamatan, Kota, Kode Pos)" 
                  value={formData.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={validation.address.visited ? (validation.address.valid ? 'valid' : 'invalid') : ''}
                  rows={4} 
                  required 
                  aria-required="true"
                ></textarea>
                <div className={`error-message ${validation.address.visited && !validation.address.valid ? 'show' : ''}`} id="addressError">
                  Alamat harus minimal 10 karakter dan maksimal 500 karakter
                </div>
                <div className={`valid-message ${validation.address.visited && validation.address.valid ? 'show' : ''}`} id="addressValid">
                  ✓ Alamat valid
                </div>
                <div className={`char-count ${formData.address.length > 450 ? (formData.address.length >= 500 ? 'danger' : 'warning') : ''}`} id="addressCharCount">
                  {formData.address.length} / 500 karakter
                </div>
              </div>

              {/* CATATAN TAMBAHAN */}
              <div className="form-group">
                <textarea 
                  id="customerNote" 
                  placeholder="Catatan Tambahan (Opsional) - Contoh: Warna, Ukuran, Pesan Khusus, dll" 
                  value={formData.note}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  rows={2}
                ></textarea>
                <div className={`char-count ${formData.note.length > 180 ? (formData.note.length >= 200 ? 'danger' : 'warning') : ''}`} id="noteCharCount">
                  {formData.note.length} / 200 karakter
                </div>
              </div>

              <button 
                className="btn-checkout" 
                onClick={handleCheckout} 
                id="checkoutBtn" 
                disabled={!isFormValid || cart.length === 0 || isProcessingCheckout}
                style={{ opacity: isFormValid && cart.length > 0 && !isProcessingCheckout ? 1 : 0.6 }}
              >
                <i className="fas fa-credit-card" aria-hidden="true"></i> Checkout
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== FOOTER ==================== */}
      <footer className="footer" role="contentinfo">
        <div>
          <h3><i className="fas fa-store" aria-hidden="true"></i> {storeName}</h3>
          <div className="social-links">
            {footer?.facebook && (
              <a href={footer.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook" aria-hidden="true"></i>
              </a>
            )}
            {footer?.instagram && (
              <a href={footer.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="fab fa-instagram" aria-hidden="true"></i>
              </a>
            )}
            {footer?.youtube && (
              <a href={footer.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <i className="fab fa-youtube" aria-hidden="true"></i>
              </a>
            )}
            {footer?.tiktok && (
              <a href={footer.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <i className="fab fa-tiktok" aria-hidden="true"></i>
              </a>
            )}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            <i className="far fa-copyright" aria-hidden="true"></i> {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
