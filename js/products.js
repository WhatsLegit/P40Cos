// Product Management Functions
document.addEventListener('DOMContentLoaded', function() {
    // Load featured products on home page
    const featuredProductsContainer = document.getElementById('featured-products');
    if (featuredProductsContainer) {
        loadFeaturedProducts();
    }

    // Load all products on shop page
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
        loadAllProducts();

        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', function() {
                const query = searchInput.value.toLowerCase();
                filterProducts(query, document.getElementById('category-filter').value);
            });

            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const query = searchInput.value.toLowerCase();
                    filterProducts(query, document.getElementById('category-filter').value);
                }
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                const query = searchInput ? searchInput.value.toLowerCase() : '';
                filterProducts(query, this.value);
            });
        }
    }

    // Load product details
    const productContent = document.getElementById('product-content');
    if (productContent) {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (productId) {
            loadProductDetails(productId);
        }
    }

    // Cart functionality
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    if (cartItems && cartSummary) {
        loadCart();
    }
});

// Load featured products
async function loadFeaturedProducts() {
    try {
        const container = document.getElementById('featured-products');
        // Keep skeletons visible while loading — don't clear yet
        
        let products = [];
        
        const querySnapshot = await db.collection('products').limit(4).get();
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        // Now replace skeletons with real products
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p>No featured products available.</p>';
            return;
        }
        
        products.forEach((product) => {
            const productCard = createProductCard(product.id, product);
            container.appendChild(productCard);
        });
        
    } catch (error) {
        console.error('Error loading featured products:', error);
        const container = document.getElementById('featured-products');
        container.innerHTML = '<p>Error loading featured products.</p>';
    }
}

// Load all products
async function loadAllProducts() {
    try {
        const container = document.getElementById('products-grid');
        container.innerHTML = '<p>Loading products...</p>';
        
        let products = [];
        
        console.log('Loading all products from Firebase...');
        const querySnapshot = await db.collection('products').get();
        querySnapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            console.log('Firebase product:', product.name, 'URL:', product.image);
            products.push(product);
        });
        console.log('Successfully loaded from Firebase');
        
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p>No products available. Please add products through the admin panel.</p>';
            return;
        }
        
        products.forEach((product) => {
            console.log('Product image URL:', product.image);
            const productCard = createProductCard(product.id, product);
            container.appendChild(productCard);
        });
        
        console.log(`Loaded ${products.length} products in shop`);
    } catch (error) {
        console.error('Error loading products:', error);
        const container = document.getElementById('products-grid');
        container.innerHTML = '<p>Error loading products. Please try again later.</p>';
    }
}

// Filter products
async function filterProducts(searchQuery, category) {
    try {
        let query = db.collection('products');

        if (category && category !== '') {
            query = query.where('category', '==', category);
        }

        const querySnapshot = await query.get();
        const container = document.getElementById('products-grid');
        container.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productName = product.name.toLowerCase();
            const productDescription = product.description.toLowerCase();

            if (searchQuery === '' || productName.includes(searchQuery) || productDescription.includes(searchQuery)) {
                const productCard = createProductCard(doc.id, product);
                container.appendChild(productCard);
            }
        });
    } catch (error) {
        console.error('Error filtering products:', error);
    }
}

// Create product card
function createProductCard(id, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">₵${product.price}</p>
            <div class="product-actions">
                <button class="add-to-cart" onclick="addToCart('${id}', '${product.name}', ${product.price}, '${product.image}')">Add to Cart</button>
                <button class="view-details" onclick="viewProductDetails('${id}')">View Details</button>
            </div>
        </div>
    `;
    return card;
}

// View product details
function viewProductDetails(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Load product details
async function loadProductDetails(productId) {
    try {
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
            const product = doc.data();
            const container = document.getElementById('product-content');
            container.innerHTML = `
                <div class="product-image-large">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-details-info">
                    <h1>${product.name}</h1>
                    <p class="product-price">₵${product.price}</p>
                    <p class="product-description">${product.description}</p>
                    <div class="product-details-actions">
                        <button class="btn-primary" onclick="addToCart('${productId}', '${product.name}', ${product.price}, '${product.image}')">Add to Cart</button>
                        <button class="btn-secondary" onclick="buyNow('${productId}', '${product.name}', ${product.price}, '${product.image}')">Buy Now</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading product details:', error);
    }
}

// Cart management
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Add to cart
function addToCart(id, name, price, image) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, image, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    saveCartToFirestore();
    alert('Product added to cart!');
}

// Buy now
function buyNow(id, name, price, image) {
    cart = [{ id, name, price, image, quantity: 1 }];
    localStorage.setItem('cart', JSON.stringify(cart));
    saveCartToFirestore();
    window.location.href = 'cart.html';
}

// Save cart to Firestore under the logged-in user
async function saveCartToFirestore() {
    try {
        const user = auth.currentUser;
        if (!user) return;
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await db.collection('carts').doc(user.uid).set({
            userId: user.uid,
            email: user.email,
            items: cart,
            total: total,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error('Error saving cart:', err);
    }
}

// Load cart
function loadCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSummaryContainer = document.getElementById('cart-summary');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        cartSummaryContainer.innerHTML = '<p>Total: ₵0</p>';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = '';

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">₵${item.price}</p>
            </div>
            <div class="quantity-controls">
                <button onclick="updateQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </div>
            <div class="cart-item-total">₵${itemTotal}</div>
            <i class="fas fa-trash remove-item" onclick="removeFromCart(${index})"></i>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartSummaryContainer.innerHTML = `
        <h3>Order Summary</h3>
        <p class="total-price">Total: ₵${total}</p>
        <button class="checkout-btn" onclick="proceedToCheckout()">Proceed to Checkout</button>
    `;
}

// Update quantity
function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart();
}

// Proceed to checkout — require login
function proceedToCheckout() {
    const user = auth.currentUser;
    if (!user) {
        // Save intended destination and redirect to login
        localStorage.setItem('redirectAfterLogin', 'checkout.html');
        window.location.href = 'login.html';
        return;
    }
    window.location.href = 'checkout.html';
}
