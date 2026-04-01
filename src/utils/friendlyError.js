// Maps technical Supabase error messages to user-friendly messages
export function friendlyError(errorMessage) {
    if (!errorMessage) return 'Something went wrong. Please try again.';

    const msg = errorMessage.toLowerCase();

    // Rate limiting
    if (msg.includes('rate limit') || msg.includes('too many requests'))
        return 'Too many attempts. Please wait a few minutes and try again.';
    if (msg.includes('request this once every'))
        return 'Please wait a minute before requesting another code.';

    // Email / OTP
    if (msg.includes('otp') && msg.includes('expired'))
        return 'Your code has expired. Please request a new one.';
    if (msg.includes('invalid') && msg.includes('otp'))
        return 'The code you entered is incorrect. Please check and try again.';
    if (msg.includes('token has expired') || msg.includes('otp has expired'))
        return 'Your verification code has expired. Please request a new one.';

    // Signup
    if (msg.includes('already registered') || msg.includes('already been registered'))
        return 'Email already used.';
    if (msg.includes('password') && msg.includes('at least'))
        return 'Password must be at least 6 characters long.';
    if (msg.includes('weak password'))
        return 'Please choose a stronger password (at least 6 characters).';
    if (msg.includes('same password'))
        return 'New password must be different from your current password.';

    // Login
    if (msg.includes('invalid login credentials'))
        return 'Incorrect email or password. Please try again.';
    if (msg.includes('email not confirmed'))
        return 'Your email is not verified yet. Please check your inbox for the verification email.';

    // Network / general
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch'))
        return 'Connection error. Please check your internet and try again.';
    if (msg.includes('timeout'))
        return 'The request timed out. Please check your internet and try again.';

    // Signup conflicts
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists'))
        return 'Email already used.';
    if (msg.includes('violates') || msg.includes('constraint'))
        return 'Something went wrong while setting up your account. Please try again.';

    // Fallback — don't show raw technical message
    return 'Something went wrong. Please try again later.';
}
