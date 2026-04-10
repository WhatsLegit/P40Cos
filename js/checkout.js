// Checkout Page Logic
document.addEventListener('DOMContentLoaded', function () {

    let currentUser = null;

    // Redirect to login if not authenticated
    auth.onAuthStateChanged(async function (user) {
        if (!user) {
            localStorage.setItem('redirectAfterLogin', 'checkout.html');
            window.location.href = 'login.html';
            return;
        }

        const ADMIN_EMAIL = 'admin@p40cosmetics.com';
        if (user.email === ADMIN_EMAIL) {
            window.location.href = 'index.html';
            return;
        }

        // Store user for use in form submit
        currentUser = user;

        // Pre-fill name and phone from user profile
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                document.getElementById('delivery-name').value = data.name || '';
                document.getElementById('delivery-phone').value = data.phone || '';
            }
        } catch (e) {
            console.error('Error loading user data:', e);
        }

        // Load cart summary
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const summaryEl = document.getElementById('checkout-summary');

        if (cart.length === 0) {
            summaryEl.innerHTML = '<p>Your cart is empty. <a href="shop.html">Go shopping</a></p>';
            document.getElementById('checkout-form').style.display = 'none';
            return;
        }

        let total = 0;
        let itemsHtml = cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span>${item.name} x${item.quantity}</span>
                <span>₵${itemTotal.toFixed(2)}</span>
            </div>`;
        }).join('');

        summaryEl.innerHTML = `
            <h3 style="margin-bottom:10px;">Order Summary</h3>
            ${itemsHtml}
            <hr style="margin:10px 0; border-color:#e0c8d8;">
            <div style="display:flex;justify-content:space-between;font-weight:600;">
                <span>Total</span><span>₵${total.toFixed(2)}</span>
            </div>
        `;
    });

    // Show/hide MoMo fields and instructions
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.getElementById('momo-field').style.display =
                this.value === 'momo' ? 'block' : 'none';
            if (this.value !== 'momo') {
                document.getElementById('momo-instructions').style.display = 'none';
            }
        });
    });

    // Show payment instructions based on network
    const networkSelect = document.getElementById('momo-network');
    if (networkSelect) {
        networkSelect.addEventListener('change', function () {
            const instructionsEl = document.getElementById('momo-instructions');
            const stepsEl = document.getElementById('momo-steps');
            const network = this.value;

            const instructions = {
                mtn: {
                    title: 'MTN MoMo (USSD)',
                    steps: [
                        'Dial <strong>*170#</strong>',
                        'Select <strong>1</strong> – Transfer Money',
                        'Select <strong>1</strong> – MTN User',
                        'Enter the number: <strong>0530737048</strong>',
                        'Enter the amount',
                        'Confirm the name shown',
                        'Enter your MoMo PIN',
                        'Confirm the transaction'
                    ]
                },
                telecel: {
                    title: 'Telecel Cash',
                    steps: [
                        'Dial <strong>*110#</strong>',
                        'Select <strong>1</strong> – Send Money',
                        'Select <strong>1</strong> – Other Networks',
                        'Enter the number: <strong>0530737048</strong>',
                        'Enter the amount',
                        'Confirm the recipient name',
                        'Enter your PIN',
                        'Confirm the payment'
                    ]
                },
                airteltigo: {
                    title: 'AirtelTigo Money',
                    steps: [
                        'Dial <strong>*110#</strong>',
                        'Select <strong>1</strong> – Send Money',
                        'Select <strong>3</strong> – Other Networks',
                        'Enter the number: <strong>0530737048</strong>',
                        'Enter the amount',
                        'Confirm the name',
                        'Enter your PIN',
                        'Confirm the transaction'
                    ]
                }
            };

            if (network && instructions[network]) {
                const info = instructions[network];
                stepsEl.innerHTML = `
                    <p style="font-weight:600; margin-bottom:8px;">${info.title}</p>
                    <ol style="padding-left:18px; line-height:2;">
                        ${info.steps.map(s => `<li>${s}</li>`).join('')}
                    </ol>
                    <p style="margin-top:10px; color:green; font-weight:500;">✅ Send payment then place your order.</p>
                `;
                instructionsEl.style.display = 'block';
            } else {
                instructionsEl.style.display = 'none';
            }
        });
    }

    // Handle form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!currentUser) {
                localStorage.setItem('redirectAfterLogin', 'checkout.html');
                window.location.href = 'login.html';
                return;
            }

            const msgEl = document.getElementById('checkout-message');
            const cart = JSON.parse(localStorage.getItem('cart')) || [];
            const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;

            const orderData = {
                userId: currentUser.uid,
                email: currentUser.email,
                name: document.getElementById('delivery-name').value,
                phone: document.getElementById('delivery-phone').value,
                location: document.getElementById('delivery-location').value,
                notes: document.getElementById('delivery-notes').value,
                paymentMethod: paymentMethod,
                momoNumber: paymentMethod === 'momo' ? document.getElementById('momo-number').value : '',
                momoNetwork: paymentMethod === 'momo' ? document.getElementById('momo-network').value : '',
                items: cart,
                total: total,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                await db.collection('orders').add(orderData);

                // Clear cart
                localStorage.removeItem('cart');
                try { await db.collection('carts').doc(currentUser.uid).delete(); } catch(e) {}

                checkoutForm.reset();
                checkoutForm.style.display = 'none';
                document.getElementById('checkout-summary').innerHTML = `
                    <div style="text-align:center; padding: 20px 0;">
                        <i class="fas fa-check-circle" style="font-size:3rem; color:#e91e8c; margin-bottom:12px; display:block;"></i>
                        <p style="font-size:1.1rem; font-weight:600; color:#333;">Order Placed Successfully!</p>
                        <p style="color:#666; margin-top:8px;">Admin will attend to you immediately.</p>
                        <a href="shop.html" class="btn-primary" style="display:inline-block; margin-top:16px;">Continue Shopping</a>
                    </div>
                `;
            } catch (error) {
                console.error('Order error:', error);
                msgEl.style.color = 'red';
                msgEl.textContent = 'Error placing order: ' + error.message;
            }
        });
    }
});
