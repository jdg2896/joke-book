# Joke Book

A password-protected, mobile-friendly joke card app. Jokes are revealed step-by-step — question → follow-up → punchline — with a shuffled order each round.

## Features

- Password gate (SHA-256 hashed, no server needed)
- Tap/click a card to reveal the follow-up, then the answer
- Shuffled playback that reshuffles when the deck runs out
- Pure HTML/CSS/JS — no build step, no dependencies

## Usage

Open `index.html` in a browser (or serve it locally). Enter the password to unlock the joke deck.

To add jokes, edit `jokes.json`:

```json
{
  "question": "Setup line?",
  "followUp": "Follow-up?",
  "answer": "Punchline."
}
```

## Changing the Password

1. Hash your new password:
   ```sh
   echo -n "yourpassword" | shasum -a 256
   ```
2. Paste the resulting hash into `app.js` as `PASSWORD_HASH`.
