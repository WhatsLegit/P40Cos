// Global variables for modal access
let modal;
let addProductForm;
let adminPanelLoaded = false;

const ADMIN_EMAIL = 'admin@p40cosmetics.com';

// Admin Panel Functions
document.addEventListener('DOMContentLoaded', function() {

    // Wait for Firebase to fully restore auth state before checking
    const unsubscribe = auth.onAuthStateChanged(async function(user) {
        if (adminPanelLoaded) return;
        unsubscribe(); // Only run once

        const overlay = document.getElementById('auth-loading');

        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = 'admin-login.html';
            return;
        }

        // Confirmed admin
        adminPanelLoaded = true;
        if (overlay) overlay.style.display = 'none';

        loadDashboardStats();
        loadProductsList();
        loadUsersList();
        loadMessagesList();
        loadCartsList();
        loadOrdersList();
    });

    // Navigation
    const navLinks = document.querySelectorAll('.admin-nav a');
    const sections = document.querySelectorAll('.admin-section');
    console.log('navLinks found:', navLinks.length, 'sections found:', sections.length);

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Nav link clicked', this.getAttribute('href'));
            const targetId = this.getAttribute('href').substring(1);
            console.log('targetId:', targetId);

            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            // Show target section
            sections.forEach(section => {
                console.log('section id:', section.id);
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                    console.log('added active to', section.id);
                }
            });
        });
    });

    // Show dashboard by default
    const defaultLink = document.querySelector('.admin-nav a[href="#dashboard"]');
    if (defaultLink) {
        defaultLink.classList.add('active');
        document.getElementById('dashboard').classList.add('active');
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            sessionStorage.removeItem('adminVerified');
            adminPanelLoaded = false;
            auth.signOut().then(() => {
                window.location.href = 'admin-login.html';
            });
        });
    }

    // Add sample products button (for testing)
    const addProductBtn = document.getElementById('add-product-btn');
    const addSampleBtn = document.createElement('button');
    addSampleBtn.textContent = 'Add Sample Products';
    addSampleBtn.className = 'btn-secondary';
    addSampleBtn.style.marginLeft = '10px';
    addSampleBtn.addEventListener('click', addSampleProducts);
    modal = document.getElementById('add-product-modal');
    const closeBtn = document.querySelector('.close');
    addProductForm = document.getElementById('add-product-form');

    if (addProductBtn && modal) {
        if (addSampleBtn && addProductBtn.parentNode) {
            addProductBtn.parentNode.insertBefore(addSampleBtn, addProductBtn.nextSibling);
        }
        console.log('addProductBtn and modal found', addProductBtn, modal);
        addProductBtn.addEventListener('click', function() {
            console.log('Add Product button clicked');
            if (addProductForm) {
                addProductForm.reset();
            }
            document.getElementById('product-id').value = '';
            document.getElementById('submit-product-btn').textContent = 'Add Product';
            modal.style.display = 'block';
        });

        if (addProductForm) {
            addProductForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted - Starting process...');
                
                const submitBtn = document.getElementById('submit-product-btn');
                const originalBtnText = submitBtn.textContent;
                
                // Disable button to prevent double submission
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
                
                try {
                    const productId = document.getElementById('product-id').value;
                    const name = document.getElementById('product-name').value;
                    const price = parseFloat(document.getElementById('product-price').value);
                    const description = document.getElementById('product-description').value;
                    const imageFile = document.getElementById('product-image').files[0];
                    const imageUrlInput = document.getElementById('product-image-url').value;
                    const category = document.getElementById('product-category').value;

                    console.log('Form data collected:', { productId, name, price, category, hasFile: !!imageFile, hasUrl: !!imageUrlInput });

                    // Validate required fields
                    if (!name || !price || !description || !category) {
                        alert('Please fill in all required fields.');
                        return;
                    }

                    let imageUrl;
                    
                    console.log('Image URL Input field value:', imageUrlInput);
                    console.log('Current Image field value:', document.getElementById('current-image').value);
                    
                    // Priority: URL input (including Cloudinary URLs) > Current image (for edits) > Default image
                    if (imageUrlInput) {
                        imageUrl = imageUrlInput;
                        console.log('Using provided image URL (Cloudinary):', imageUrl);
                    } else if (productId) {
                        // Use current image (for edits)
                        imageUrl = document.getElementById('current-image').value;
                        console.log('Using existing image URL:', imageUrl);
                    } else {
                        // Use default image for new products without uploaded image
                        imageUrl = 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80';
                        console.log('Using default image:', imageUrl);
                    }
                    
                    console.log('Final image URL to be saved:', imageUrl);

                    // Prepare product data
                    const productData = {
                        name: name,
                        price: price,
                        description: description,
                        image: imageUrl,
                        category: category
                    };

                    // Try Firestore first, fallback to localStorage
                    try {
                        if (productId) {
                            // Update product
                            productData.updatedAt = new Date().toISOString();
                            console.log('Updating product with ID:', productId);
                            await db.collection('products').doc(productId).update(productData);
                            console.log('Product updated successfully!');
                            alert('Product updated successfully!');
                        } else {
                            // Add new product
                            productData.createdAt = new Date().toISOString();
                            console.log('Saving new product to Firestore...');
                            console.log('Product data:', productData);
                            
                            const docRef = await db.collection('products').add(productData);
                            console.log('Product saved successfully with ID:', docRef.id);
                            alert('Product added successfully!');
                        }
                    } catch (firestoreError) {
                        if (firestoreError.code === 'permission-denied') {
                            console.log('Firestore permissions error, using localStorage fallback');
                            // Fallback to localStorage
                            let products = JSON.parse(localStorage.getItem('adminProducts') || '[]');
                            
                            if (productId) {
                                // Update existing product
                                const index = products.findIndex(p => p.id === productId);
                                if (index !== -1) {
                                    products[index] = { ...products[index], ...productData, updatedAt: new Date().toISOString() };
                                    alert('Product updated successfully (stored locally)!');
                                }
                            } else {
                                // Add new product
                                const newProduct = { ...productData, id: 'local_' + Date.now() };
                                products.push(newProduct);
                                alert('Product added successfully (stored locally)!');
                            }
                            
                            localStorage.setItem('adminProducts', JSON.stringify(products));
                        } else {
                            throw firestoreError;
                        }
                    }
                    
                    // Close modal and reset form
                    modal.style.display = 'none';
                    addProductForm.reset();
                    document.getElementById('product-id').value = '';
                    document.getElementById('current-image').value = '';
                    document.getElementById('submit-product-btn').textContent = 'Add Product';
                    // Clear upload status
                    const statusDiv = document.getElementById('upload-status');
                    if (statusDiv) {
                        statusDiv.innerHTML = '';
                    }
                    
                    // Reload lists
                    loadProductsList();
                    loadDashboardStats();
                    
                } catch (error) {
                    console.error('Error saving product:', error);
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message,
                        stack: error.stack
                    });
                    
                    // Provide more specific error messages
                    let errorMessage = 'Error saving product: ';
                    if (error.code === 'unavailable') {
                        errorMessage += 'Firebase is currently unavailable. Please check your internet connection and try again.';
                    } else if (error.code === 'permission-denied') {
                        errorMessage += 'Permission denied. Please check Firebase security rules.';
                    } else if (error.code === 'not-found') {
                        errorMessage += 'Collection not found. Please ensure Firestore is set up correctly.';
                    } else {
                        errorMessage += error.message;
                    }
                    
                    alert(errorMessage);
                } finally {
                    // Re-enable button
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    console.log('Form submission process completed');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
        }

        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const [usersSnapshot, productsSnapshot, messagesSnapshot] = await Promise.all([
            db.collection('users').get(),
            db.collection('products').get(),
            db.collection('messages').get()
        ]);

        document.getElementById('total-users').textContent = usersSnapshot.size;
        document.getElementById('total-products').textContent = productsSnapshot.size;
        document.getElementById('total-messages').textContent = messagesSnapshot.size;

        try {
            const cartsSnapshot = await db.collection('carts').get();
            const cartsEl = document.getElementById('total-carts');
            if (cartsEl) cartsEl.textContent = cartsSnapshot.size;
        } catch (e) {
            console.warn('Carts not accessible:', e.message);
        }

        try {
            const ordersSnapshot = await db.collection('orders').get();
            const ordersEl = document.getElementById('total-orders');
            if (ordersEl) ordersEl.textContent = ordersSnapshot.size;
        } catch (e) {
            console.warn('Orders not accessible:', e.message);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load products list for admin
async function loadProductsList() {
    try {
        const container = document.getElementById('products-list');
        container.innerHTML = '';
        
        try {
            const querySnapshot = await db.collection('products').get();
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const productItem = createProductItem(doc.id, product);
                container.appendChild(productItem);
            });
        } catch (firestoreError) {
            if (firestoreError.code === 'permission-denied') {
                console.log('Firestore permissions error, using localStorage fallback');
                // Use localStorage as fallback
                const products = JSON.parse(localStorage.getItem('adminProducts') || '[]');
                products.forEach((product) => {
                    const productItem = createProductItem(product.id, product);
                    container.appendChild(productItem);
                });
            } else {
                throw firestoreError;
            }
        }
    } catch (error) {
        console.error('Error loading products list:', error);
    }
}

// Helper function to create product item
function createProductItem(productId, product) {
    const productItem = document.createElement('div');
    productItem.className = 'admin-item';
    productItem.innerHTML = `
        <div class="admin-item-info">
            <img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
            <div>
                <h4>${product.name}</h4>
                <p>₵${product.price} - ${product.category}</p>
            </div>
        </div>
        <div class="admin-item-actions">
            <button onclick="editProduct('${productId}')" class="btn-secondary">Edit</button>
            <button onclick="deleteProduct('${productId}')" class="btn-secondary" style="background: #ff4444; color: white;">Delete</button>
        </div>
    `;
    return productItem;
}

// Load users list for admin
async function loadUsersList() {
    try {
        const container = document.getElementById('users-list');
        container.innerHTML = '';
        
        try {
            const querySnapshot = await db.collection('users').get();
            querySnapshot.forEach((doc) => {
                const user = doc.data();
                const userItem = createUserItem(doc.id, user);
                container.appendChild(userItem);
            });
        } catch (firestoreError) {
            if (firestoreError.code === 'permission-denied') {
                console.log('Firestore permissions error, using localStorage fallback');
                const users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
                users.forEach((user) => {
                    const userItem = createUserItem(user.id, user);
                    container.appendChild(userItem);
                });
            } else {
                throw firestoreError;
            }
        }
    } catch (error) {
        console.error('Error loading users list:', error);
    }
}

// Helper function to create user item
function createUserItem(userId, user) {
    const userItem = document.createElement('div');
    userItem.className = 'admin-item';
    userItem.innerHTML = `
        <div class="admin-item-info">
            <div>
                <h4>${user.name}</h4>
                <p>${user.email} - ${user.phone}</p>
                <span class="status ${user.status || 'active'}">${user.status || 'active'}</span>
            </div>
        </div>
        <div class="admin-item-actions">
            <button onclick="toggleUserStatus('${userId}', '${user.status || 'active'}')" class="btn-secondary">
                ${(user.status || 'active') === 'active' ? 'Block' : 'Unblock'}
            </button>
            <button onclick="deleteUser('${userId}')" class="btn-secondary" style="background: #ff4444; color: white;">Delete</button>
        </div>
    `;
    return userItem;
}

// Load messages list for admin
async function loadMessagesList() {
    try {
        const container = document.getElementById('messages-list');
        container.innerHTML = '';
        
        try {
            const querySnapshot = await db.collection('messages').orderBy('date', 'desc').get();
            querySnapshot.forEach((doc) => {
                const message = doc.data();
                const messageItem = createMessageItem(doc.id, message);
                container.appendChild(messageItem);
            });
        } catch (firestoreError) {
            if (firestoreError.code === 'permission-denied') {
                console.log('Firestore permissions error, using localStorage fallback');
                const messages = JSON.parse(localStorage.getItem('adminMessages') || '[]');
                messages.forEach((message) => {
                    const messageItem = createMessageItem(message.id, message);
                    container.appendChild(messageItem);
                });
            } else {
                throw firestoreError;
            }
        }
    } catch (error) {
        console.error('Error loading messages list:', error);
    }
}

// Helper function to create message item
function createMessageItem(messageId, message) {
    const messageItem = document.createElement('div');
    messageItem.className = 'admin-item';
    messageItem.innerHTML = `
        <div class="admin-item-info">
            <div>
                <h4>${message.name}</h4>
                <p>${message.email} - ${message.phone}</p>
                <p>${message.message}</p>
                <small>${message.date ? (message.date.toDate ? message.date.toDate().toLocaleDateString() : new Date(message.date).toLocaleDateString()) : 'N/A'}</small>
            </div>
        </div>
        <div class="admin-item-actions">
            <button onclick="deleteMessage('${messageId}')" class="btn-secondary" style="background: #ff4444; color: white;">Delete</button>
        </div>
    `;
    return messageItem;
}

// Delete product
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            try {
                await db.collection('products').doc(productId).delete();
                alert('Product deleted successfully!');
            } catch (firestoreError) {
                if (firestoreError.code === 'permission-denied') {
                    // Fallback to localStorage
                    let products = JSON.parse(localStorage.getItem('adminProducts') || '[]');
                    products = products.filter(p => p.id !== productId);
                    localStorage.setItem('adminProducts', JSON.stringify(products));
                    alert('Product deleted successfully (from local storage)!');
                } else {
                    throw firestoreError;
                }
            }
            loadProductsList();
            loadDashboardStats();
        } catch (error) {
            alert('Error deleting product: ' + error.message);
        }
    }
}

// Edit product
async function editProduct(productId) {
    try {
        let product;
        
        try {
            const doc = await db.collection('products').doc(productId).get();
            if (doc.exists) {
                product = doc.data();
            }
        } catch (firestoreError) {
            if (firestoreError.code === 'permission-denied') {
                // Fallback to localStorage
                const products = JSON.parse(localStorage.getItem('adminProducts') || '[]');
                product = products.find(p => p.id === productId);
            } else {
                throw firestoreError;
            }
        }
        
        if (product) {
            document.getElementById('product-id').value = productId;
            document.getElementById('current-image').value = product.image;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-category').value = product.category;
            document.getElementById('submit-product-btn').textContent = 'Update Product';
            modal.style.display = 'block';
        } else {
            alert('Product not found');
        }
    } catch (error) {
        alert('Error loading product: ' + error.message);
    }
}

// Toggle user status
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
        try {
            await db.collection('users').doc(userId).update({
                status: newStatus
            });
        } catch (firestoreError) {
            if (firestoreError.code === 'permission-denied') {
                // Fallback to localStorage
                let users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
                const index = users.findIndex(u => u.id === userId);
                if (index !== -1) {
                    users[index].status = newStatus;
                    localStorage.setItem('adminUsers', JSON.stringify(users));
                }
            } else {
                throw firestoreError;
            }
        }
        alert(`User ${newStatus} successfully!`);
        loadUsersList();
    } catch (error) {
        alert('Error updating user status: ' + error.message);
    }
}

// Delete user
async function deleteUser(userId) {
    if (confirm('Are you sure you want to block and delete this user? They will no longer be able to log in.')) {
        try {
            // Set status to blocked first, then delete the document
            await db.collection('users').doc(userId).update({ status: 'blocked' });
            await db.collection('users').doc(userId).delete();
            alert('User blocked and deleted successfully!');
            loadUsersList();
            loadDashboardStats();
        } catch (error) {
            alert('Error deleting user: ' + error.message);
        }
    }
}

// Delete message
async function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        try {
            try {
                await db.collection('messages').doc(messageId).delete();
            } catch (firestoreError) {
                if (firestoreError.code === 'permission-denied') {
                    // Fallback to localStorage
                    let messages = JSON.parse(localStorage.getItem('adminMessages') || '[]');
                    messages = messages.filter(m => m.id !== messageId);
                    localStorage.setItem('adminMessages', JSON.stringify(messages));
                } else {
                    throw firestoreError;
                }
            }
            alert('Message deleted successfully!');
            loadMessagesList();
            loadDashboardStats();
        } catch (error) {
            console.error("Error deleting message:", error);
            alert('Error deleting message: ' + error.message);
        }
    }
}

// Upload product image to Cloudinary
async function uploadProduct(){
    const file = document.getElementById("imageUpload").files[0]
    const statusDiv = document.getElementById("upload-status")
    
    if (!file) {
        statusDiv.innerHTML = '<span style="color: red;">Please select an image file to upload</span>'
        return
    }
    
    console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type)
    statusDiv.innerHTML = '<span style="color: blue;">Uploading ' + file.name + '...</span>'
    
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", "ml_default")
    // Add timestamp to ensure unique filename
    formData.append("public_id", "product_" + Date.now())
    
    try {
        console.log("Sending upload request to Cloudinary...")
        const response = await fetch("https://api.cloudinary.com/v1_1/dxecjpgsd/image/upload",{
            method:"POST",
            body:formData
        })
        
        const data = await response.json()
        console.log("Cloudinary response:", data)
        
        if (data.secure_url) {
            // Clear any existing URL and set the new one
            const urlField = document.getElementById("product-image-url")
            urlField.value = data.secure_url
            
            statusDiv.innerHTML = '<span style="color: green;">✓ Upload successful! URL saved.</span>'
            console.log("Cloudinary upload successful:", data.secure_url)
            console.log("Public ID:", data.public_id)
            console.log("URL field updated to:", urlField.value)
        } else {
            console.error("Cloudinary upload failed:", data)
            statusDiv.innerHTML = '<span style="color: red;">✗ Upload failed: ' + (data.error?.message || 'Unknown error') + '</span>'
            throw new Error("Upload failed - no secure URL returned. Response: " + JSON.stringify(data))
        }
    } catch (error) {
        console.error("Cloudinary upload error:", error)
        statusDiv.innerHTML = '<span style="color: red;">✗ Error: ' + error.message + '</span>'
        alert("Error uploading image: " + error.message)
    }
}

// Add sample products for testing
async function addSampleProducts() {
    const sampleProducts = [
        {
            name: "Matte Lipstick",
            price: 25.99,
            description: "Long-lasting matte lipstick in various shades. Perfect for everyday wear.",
            image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            category: "lipstick"
        },
        {
            name: "Foundation Cream",
            price: 45.99,
            description: "Lightweight foundation that provides natural coverage and all-day wear.",
            image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            category: "foundation"
        },
        {
            name: "Skincare Moisturizer",
            price: 35.99,
            description: "Hydrating moisturizer for all skin types. Enriched with natural ingredients.",
            image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            category: "skincare"
        },
        {
            name: "Makeup Brush Set",
            price: 55.99,
            description: "Professional makeup brush set with 12 premium brushes for flawless application.",
            image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            category: "tools"
        }
    ];

    try {
        const batch = db.batch();
        sampleProducts.forEach(product => {
            const docRef = db.collection('products').doc();
            batch.set(docRef, {
                ...product,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        await batch.commit();
        alert('Sample products added successfully!');
        loadProductsList();
        loadDashboardStats();
    } catch (error) {
        alert('Error adding sample products: ' + error.message);
    }
}

// Load customer carts
async function loadCartsList() {
    try {
        const container = document.getElementById('carts-list');
        if (!container) return;
        container.innerHTML = '';

        const querySnapshot = await db.collection('carts').get();

        if (querySnapshot.empty) {
            container.innerHTML = '<p>No active carts.</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const cart = doc.data();
            const cartItem = document.createElement('div');
            cartItem.className = 'admin-item';

            const itemsList = (cart.items || []).map(i =>
                `<span style="display:inline-block;margin:2px 4px;background:#f9f0f5;padding:2px 8px;border-radius:12px;font-size:0.8rem;">${i.name} x${i.quantity}</span>`
            ).join('');

            const updated = cart.updatedAt
                ? (cart.updatedAt.toDate ? cart.updatedAt.toDate().toLocaleString() : new Date(cart.updatedAt).toLocaleString())
                : 'N/A';

            cartItem.innerHTML = `
                <div class="admin-item-info">
                    <div>
                        <h4>${cart.email || 'Unknown user'}</h4>
                        <p>Total: ₵${(cart.total || 0).toFixed(2)}</p>
                        <div style="margin-top:4px;">${itemsList}</div>
                        <small>Last updated: ${updated}</small>
                    </div>
                </div>
            `;
            container.appendChild(cartItem);
        });
    } catch (error) {
        console.error('Error loading carts:', error);
    }
}

// Load orders
async function loadOrdersList() {
    try {
        const container = document.getElementById('orders-list');
        if (!container) return;
        container.innerHTML = '<p>Loading orders...</p>';

        const querySnapshot = await db.collection('orders').get();

        if (querySnapshot.empty) {
            container.innerHTML = '<p>No orders yet.</p>';
            return;
        }

        container.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const date = order.createdAt
                ? (order.createdAt.toDate ? order.createdAt.toDate().toLocaleString() : new Date(order.createdAt).toLocaleString())
                : 'N/A';

            const itemsList = (order.items || []).map(i =>
                `<span style="display:inline-block;margin:2px 4px;background:#f9f0f5;padding:2px 8px;border-radius:12px;font-size:0.8rem;">${i.name} x${i.quantity}</span>`
            ).join('');

            const paymentInfo = order.paymentMethod === 'momo'
                ? `MoMo (${order.momoNetwork || ''}) — ${order.momoNumber || ''}`
                : order.paymentMethod === 'cash' ? 'Cash on Delivery' : 'Bank Transfer';

            const statusColor = {
                pending: '#ff9800',
                confirmed: '#2196f3',
                delivered: '#4caf50',
                cancelled: '#f44336'
            }[order.status || 'pending'] || '#ff9800';

            const orderItem = document.createElement('div');
            orderItem.className = 'admin-item';
            orderItem.style.cssText = 'flex-direction:column; border-left: 4px solid ' + statusColor + '; margin-bottom:16px;';
            orderItem.innerHTML = `
                <div style="width:100%;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <h4 style="margin:0;">${order.name || 'N/A'}</h4>
                        <span style="background:${statusColor};color:white;padding:3px 12px;border-radius:12px;font-size:0.8rem;text-transform:capitalize;">${order.status || 'pending'}</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                        <p style="margin:0;"><i class="fas fa-phone" style="color:#e91e8c;margin-right:6px;"></i>${order.phone || 'N/A'}</p>
                        <p style="margin:0;"><i class="fas fa-envelope" style="color:#e91e8c;margin-right:6px;"></i>${order.email || 'N/A'}</p>
                        <p style="margin:0;"><i class="fas fa-map-marker-alt" style="color:#e91e8c;margin-right:6px;"></i>${order.location || 'N/A'}</p>
                        <p style="margin:0;"><i class="fas fa-credit-card" style="color:#e91e8c;margin-right:6px;"></i>${paymentInfo}</p>
                    </div>
                    ${order.notes ? `<p style="margin:0 0 8px;color:#666;font-style:italic;"><i class="fas fa-sticky-note" style="margin-right:6px;"></i>${order.notes}</p>` : ''}
                    <div style="margin-bottom:8px;">${itemsList}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <p style="margin:0;font-weight:700;color:#e91e8c;font-size:1rem;">Total: ₵${(order.total || 0).toFixed(2)}</p>
                        <small style="color:#999;">${date}</small>
                    </div>
                </div>
                <div style="display:flex;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #f0e0ea;">
                    <select onchange="updateOrderStatus('${doc.id}', this.value)" style="padding:6px 10px;border-radius:8px;border:1px solid #ddd;flex:1;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button onclick="deleteOrder('${doc.id}')" class="btn-secondary" style="background:#ff4444;color:white;">Delete</button>
                </div>
            `;
            container.appendChild(orderItem);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        const container = document.getElementById('orders-list');
        if (container) container.innerHTML = `<p style="color:red;">Error loading orders: ${error.message}</p>`;
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        await db.collection('orders').doc(orderId).update({ status });
        loadDashboardStats();
    } catch (error) {
        alert('Error updating order: ' + error.message);
    }
}

// Delete order
async function deleteOrder(orderId) {
    if (confirm('Delete this order?')) {
        try {
            await db.collection('orders').doc(orderId).delete();
            loadOrdersList();
            loadDashboardStats();
        } catch (error) {
            alert('Error deleting order: ' + error.message);
        }
    }
}
