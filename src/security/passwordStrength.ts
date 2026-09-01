export function isWeakPassword(password: string): boolean {
    if (!password) {return false;}
    if (password.length < 10) {return true;}

    let classes = 0;

    if (/[a-z]/.test(password)) {classes++;}
    if (/[A-Z]/.test(password)) {classes++;}
    if (/[0-9]/.test(password)) {classes++;}
    if (/[^A-Za-z0-9]/.test(password)) {classes++;}

    return classes < 3;
}
