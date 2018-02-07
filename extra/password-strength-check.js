function evaluatePasswordStrength(password, translate) {
    password = password.trim();
    var indicatorText = void 0;
    var indicatorClass = void 0;
    var weaknesses = 0;
    var strength = 100;
    var msg = [];

    var hasLowercase = /[a-z]/.test(password);
    var hasUppercase = /[A-Z]/.test(password);
    var hasNumbers = /[0-9]/.test(password);
    var hasPunctuation = /[^a-zA-Z0-9]/.test(password);

    var $usernameBox = $('input.username');
    var username = $usernameBox.length > 0 ? $usernameBox.val() : translate.username;

    if (password.length < 12) {
        msg.push(translate.tooShort);
        strength -= (12 - password.length) * 5 + 30;
    }

    if (!hasLowercase) {
        msg.push(translate.addLowerCase);
        weaknesses++;
    }
    if (!hasUppercase) {
        msg.push(translate.addUpperCase);
        weaknesses++;
    }
    if (!hasNumbers) {
        msg.push(translate.addNumbers);
        weaknesses++;
    }
    if (!hasPunctuation) {
        msg.push(translate.addPunctuation);
        weaknesses++;
    }

    switch (weaknesses) {
        case 1:
            strength -= 12.5;
            break;

        case 2:
            strength -= 25;
            break;

        case 3:
            strength -= 40;
            break;

        case 4:
            strength -= 40;
            break;
    }

    if (password !== '' && password.toLowerCase() === username.toLowerCase()) {
        msg.push(translate.sameAsUsername);

        strength = 5;
    }

    if (strength < 60) {
        indicatorText = translate.weak;
        indicatorClass = 'is-weak';
    } else if (strength < 70) {
        indicatorText = translate.fair;
        indicatorClass = 'is-fair';
    } else if (strength < 80) {
        indicatorText = translate.good;
        indicatorClass = 'is-good';
    } else if (strength <= 100) {
        indicatorText = translate.strong;
        indicatorClass = 'is-strong';
    }

    msg = translate.hasWeaknesses + '<ul><li>' + msg.join('</li><li>') + '</li></ul>';

    return {
        strength: strength,
        message: msg,
        indicatorText: indicatorText,
        indicatorClass: indicatorClass
    };
};