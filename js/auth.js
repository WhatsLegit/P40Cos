// Authentication Functions
document.addEventListener('DOMContentLoaded', function() {
    // Don't run auth.js logic on admin pages — admin.js handles that
    if (window.location.pathname.includes('admin')) return;

    // Check authentication state
    auth.onAuthStateChanged(async function(user) {
        const loginLink = document.getElementById('login-link');
        const ADMIN_EMAIL = 'admin@p40cosmetics.com';

        if (user && user.email === ADMIN_EMAIL) {
            // Admin should not appear as logged in on the main site
            if (loginLink) {
                loginLink.textContent = 'Login';
                loginLink.href = 'login.html';
            }
            return;
        }
        if (user) {
            // Check if user is blocked
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                // Only sign out if we confirmed the user is blocked
                if (userDoc.exists && userDoc.data().status === 'blocked') {
                    await auth.signOut();
                    if (loginLink) {
                        loginLink.textContent = 'Login';
                        loginLink.href = 'login.html';
                    }
                    const msgEl = document.getElementById('login-message');
                    if (msgEl) msgEl.textContent = 'Your account has been blocked. Contact support.';
                    return;
                }

                // User is active — show profile in nav
                if (loginLink) {
                    const userData = userDoc.exists ? userDoc.data() : {};
                    const displayName = userData.name || user.email;
                    const initial = displayName.charAt(0).toUpperCase();

                    loginLink.outerHTML = `
                        <div class="user-profile" id="user-profile">
                            <div class="user-avatar" id="user-avatar-btn">${initial}</div>
                            <div class="profile-dropdown" id="profile-dropdown">
                                <div class="profile-header">
                                    <div class="profile-avatar-large">${initial}</div>
                                    <div>
                                        <p class="profile-name">${displayName}</p>
                                        <p class="profile-email">${user.email}</p>
                                        ${userData.phone ? `<p class="profile-phone">${userData.phone}</p>` : ''}
                                    </div>
                                </div>
                                <hr>
                                <a href="#" id="logout-link">Logout</a>
                            </div>
                        </div>
                    `;

                    document.getElementById('user-avatar-btn').addEventListener('click', function(e) {
                        e.stopPropagation();
                        document.getElementById('profile-dropdown').classList.toggle('show');
                    });

                    document.addEventListener('click', function() {
                        const dd = document.getElementById('profile-dropdown');
                        if (dd) dd.classList.remove('show');
                    });

                    document.getElementById('logout-link').addEventListener('click', function(e) {
                        e.preventDefault();
                        auth.signOut().then(() => {
                            window.location.href = 'index.html';
                        });
                    });
                }
            } catch (err) {
                // On error, don't sign out — just show the avatar with email initial
                console.warn('Could not fetch user profile:', err.message);
                if (loginLink) {
                    const initial = user.email.charAt(0).toUpperCase();
                    loginLink.outerHTML = `
                        <div class="user-profile" id="user-profile">
                            <div class="user-avatar" id="user-avatar-btn">${initial}</div>
                            <div class="profile-dropdown" id="profile-dropdown">
                                <div class="profile-header">
                                    <div class="profile-avatar-large">${initial}</div>
                                    <div>
                                        <p class="profile-name">${user.email}</p>
                                    </div>
                                </div>
                                <hr>
                                <a href="#" id="logout-link">Logout</a>
                            </div>
                        </div>
                    `;
                    document.getElementById('user-avatar-btn').addEventListener('click', function(e) {
                        e.stopPropagation();
                        document.getElementById('profile-dropdown').classList.toggle('show');
                    });
                    document.addEventListener('click', function() {
                        const dd = document.getElementById('profile-dropdown');
                        if (dd) dd.classList.remove('show');
                    });
                    document.getElementById('logout-link').addEventListener('click', function(e) {
                        e.preventDefault();
                        auth.signOut().then(() => { window.location.href = 'index.html'; });
                    });
                }
            }
        } else {
            if (loginLink) {
                loginLink.textContent = 'Login';
                loginLink.href = 'login.html';
            }
        }
    });

    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const redirect = localStorage.getItem('redirectAfterLogin');
                    if (redirect) {
                        localStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirect;
                    } else {
                        window.location.href = 'index.html';
                    }
                })
                .catch((error) => {
                    document.getElementById('login-message').textContent = error.message;
                });
        });
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const fullName = document.getElementById('full-name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const msgEl = document.getElementById('register-message');

            const ADMIN_EMAIL = 'admin@p40cosmetics.com';

            if (email.toLowerCase() === ADMIN_EMAIL) {
                msgEl.textContent = 'This email cannot be used for registration.';
                return;
            }

            try {
                // Create auth account first (blocks duplicate emails automatically)
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Now authenticated — check if phone already exists
                const phoneQuery = await db.collection('users').where('phone', '==', phone).get();
                if (!phoneQuery.empty) {
                    // Phone taken — delete the auth account we just created and stop
                    await user.delete();
                    msgEl.textContent = 'Phone number already registered.';
                    return;
                }

                // Save user data to Firestore
                await db.collection('users').doc(user.uid).set({
                    name: fullName,
                    phone: phone,
                    email: email,
                    status: 'active',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.location.href = 'index.html';
            } catch (error) {
                if (error.code === 'auth/email-already-in-use') {
                    msgEl.textContent = 'An account with this email already exists.';
                } else {
                    msgEl.textContent = error.message;
                }
            }
        });
    }

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const message = document.getElementById('message').value;

            try {
                await db.collection('messages').add({
                    name: name,
                    email: email,
                    phone: phone,
                    message: message,
                    date: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.getElementById('contact-message').textContent = 'Message sent successfully!';
                contactForm.reset();
            } catch (error) {
                document.getElementById('contact-message').textContent = 'Error sending message: ' + error.message;
            }
        });
    }
});