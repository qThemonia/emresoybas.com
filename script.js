const button = document.querySelector('#button');
const button1 = document.querySelector('#old');

const jsConfetti = new JSConfetti();

button.addEventListener('click', () => {
    jsConfetti.addConfetti({
        emojis: ['👵'],
    });
});
button1.addEventListener('click', () => {
    jsConfetti.addConfetti({
        emojis: ['👵'],
    });
});
