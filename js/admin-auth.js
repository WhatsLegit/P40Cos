// Admin Authentication Functions
document.addEventListener('DOMContentLoaded', function() {
    // Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;

            const ADMIN_EMAIL = 'admin@p40cosmetics.com'; // Change this to your desired admin email

            try {
                // Sign in with email and password
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Verify the user is signed in with the correct admin email
                if (user.email === ADMIN_EMAIL) {
                    sessionStorage.setItem('adminVerified', 'true');
                    window.location.href = 'admin.html';
                } else {
                    // Something went wrong
                    await auth.signOut();
                    document.getElementById('admin-login-message').textContent = 'Access denied. Admin privileges required.';
                }
            } catch (error) {
                document.getElementById('admin-login-message').textContent = error.message;
            }
        });
    }
});