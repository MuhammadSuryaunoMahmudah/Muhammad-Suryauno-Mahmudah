/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from '@google/genai';

interface Flashcard {
  term: string;
  definition: string;
}

const DEFAULT_FLASHCARDS: Flashcard[] = [
    { term: 'Mercury', definition: 'The smallest planet in our solar system and nearest to the Sun.' },
    { term: 'Venus', definition: 'The second planet from the Sun, known for its thick, toxic atmosphere.' },
    { term: 'Earth', definition: 'Our home planet, the only place known to harbor life.' },
    { term: 'Mars', definition: 'The "Red Planet," known for its iron oxide-rich soil.' },
    { term: 'Jupiter', definition: 'The largest planet, a gas giant with a Great Red Spot.' },
    { term: 'Saturn', definition: 'Known for its spectacular ring system, composed mostly of ice particles.' },
];

// Main App Elements
const topicInput = document.getElementById('topicInput') as HTMLTextAreaElement;
const generateButton = document.getElementById('generateButton') as HTMLButtonElement;
const buttonText = generateButton.querySelector('.button-text') as HTMLSpanElement;
const spinner = generateButton.querySelector('.spinner') as HTMLDivElement;
const flashcardsContainer = document.getElementById('flashcardsContainer') as HTMLDivElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
const exampleMessage = document.getElementById('exampleMessage') as HTMLDivElement;
const changeApiKeyLink = document.getElementById('changeApiKeyLink') as HTMLAnchorElement;

// API Key Modal Elements
const apiKeyModal = document.getElementById('apiKeyModal') as HTMLDialogElement;
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const saveApiKeyButton = document.getElementById('saveApiKeyButton') as HTMLButtonElement;
const cancelApiKeyButton = document.getElementById('cancelApiKey') as HTMLButtonElement;

let ai: GoogleGenAI | null = null;
const API_KEY_SESSION_STORAGE_KEY = 'GEMINI_API_KEY';

/**
 * Renders a list of flashcards to the container.
 * @param {Flashcard[]} cards The flashcards to display.
 */
function renderFlashcards(cards: Flashcard[]) {
  flashcardsContainer.innerHTML = ''; // Clear existing cards
  cards.forEach((flashcard, index) => {
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('flashcard');
    cardDiv.dataset['index'] = index.toString();
    cardDiv.setAttribute('role', 'button');
    cardDiv.setAttribute('aria-pressed', 'false');
    cardDiv.setAttribute('aria-label', `Flashcard for ${flashcard.term}. Click to flip.`);


    const cardInner = document.createElement('div');
    cardInner.classList.add('flashcard-inner');

    const cardFront = document.createElement('div');
    cardFront.classList.add('flashcard-front');
    const termDiv = document.createElement('div');
    termDiv.classList.add('term');
    termDiv.textContent = flashcard.term;

    const cardBack = document.createElement('div');
    cardBack.classList.add('flashcard-back');
    const definitionDiv = document.createElement('div');
    definitionDiv.classList.add('definition');
    definitionDiv.textContent = flashcard.definition;

    cardFront.appendChild(termDiv);
    cardBack.appendChild(definitionDiv);
    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner);

    flashcardsContainer.appendChild(cardDiv);

    cardDiv.addEventListener('click', () => {
      cardDiv.classList.toggle('flipped');
      const isFlipped = cardDiv.classList.contains('flipped');
      cardDiv.setAttribute('aria-pressed', isFlipped.toString());
    });
  });
}

/**
 * Initializes the GoogleGenAI client.
 * @param {string} apiKey The Gemini API key.
 * @returns {boolean} True if successful, false otherwise.
 */
function initializeAi(apiKey: string): boolean {
  try {
    ai = new GoogleGenAI({ apiKey });
    return true;
  } catch (e: unknown) {
    errorMessage.textContent = 'Failed to initialize with the provided API key. Please check the key and try again.';
    console.error(e);
    return false;
  }
}

/**
 * Toggles the loading state of the generate button.
 * @param {boolean} isLoading True to show loading, false to hide.
 */
function setLoading(isLoading: boolean) {
  generateButton.disabled = isLoading;
  buttonText.classList.toggle('hidden', isLoading);
  spinner.classList.toggle('hidden', !isLoading);
}


/**
 * Generates and renders flashcards based on the topic input.
 */
async function generateAndRenderCards() {
  const topic = topicInput.value.trim();
  if (!topic) {
    errorMessage.textContent = 'Please enter a topic or some terms and definitions.';
    return;
  }
  if (!ai) {
    errorMessage.textContent = 'API client is not initialized. Please set your API key.';
    apiKeyModal.showModal(); // Prompt for key if missing
    return;
  }

  setLoading(true);
  errorMessage.textContent = '';
  exampleMessage.classList.add('hidden');
  flashcardsContainer.innerHTML = '';

  try {
    const prompt = `Generate a list of flashcards for the topic of "${topic}". Each flashcard should have a term and a concise definition. Format the output as a list of "Term: Definition" pairs, with each pair on a new line. Ensure terms and definitions are distinct and clearly separated by a single colon. Do not include any introductory text. For example:
Hello: Hola
Goodbye: Adiós`;
    
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const responseText = result.text ?? '';
    if (!responseText) {
      throw new Error('Received an empty response from the API.');
    }

    const flashcards: Flashcard[] = responseText
      .split('\n')
      .map((line) => {
        const parts = line.split(':');
        if (parts.length >= 2 && parts[0].trim()) {
          const term = parts[0].trim();
          const definition = parts.slice(1).join(':').trim();
          if (definition) {
            return { term, definition };
          }
        }
        return null;
      })
      .filter((card): card is Flashcard => card !== null);

    if (flashcards.length > 0) {
      renderFlashcards(flashcards);
    } else {
      errorMessage.textContent = 'Could not parse any valid flashcards from the response. The topic might be too ambiguous. Please try again with a more specific topic.';
    }
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    let detailedError = (error as Error)?.message || 'An unknown error occurred';
    if (detailedError.includes('API key not valid')) {
      detailedError = 'Your API key is not valid. Please click "Change API Key" to enter a new one.';
      sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
      ai = null; // De-initialize
    }
    errorMessage.textContent = `An error occurred: ${detailedError}`;
  } finally {
    setLoading(false);
  }
}


// --- Event Listeners ---

// On page load
document.addEventListener('DOMContentLoaded', () => {
  const storedApiKey = sessionStorage.getItem(API_KEY_SESSION_STORAGE_KEY);
  if (storedApiKey) {
    initializeAi(storedApiKey);
  }
  // Always render default cards on load for demonstration
  renderFlashcards(DEFAULT_FLASHCARDS);
  exampleMessage.classList.remove('hidden');
});

// Generate button click
generateButton.addEventListener('click', () => {
  if (!ai) {
    apiKeyModal.showModal();
  } else {
    generateAndRenderCards();
  }
});

// Save API Key from modal
saveApiKeyButton.addEventListener('click', (e) => {
    e.preventDefault();
    const apiKey = apiKeyInput.value.trim();
    if (apiKey && initializeAi(apiKey)) {
        sessionStorage.setItem(API_KEY_SESSION_STORAGE_KEY, apiKey);
        apiKeyInput.value = ''; // Clear input for security
        apiKeyModal.close();
        generateAndRenderCards(); // Proceed to generate cards
    } else if (!apiKey) {
        alert('Please enter a valid API key.');
    }
});

// Cancel button in modal
cancelApiKeyButton.addEventListener('click', () => {
  apiKeyModal.close();
});

// "Change API Key" link in footer
changeApiKeyLink.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
  ai = null;
  apiKeyModal.showModal();
});
