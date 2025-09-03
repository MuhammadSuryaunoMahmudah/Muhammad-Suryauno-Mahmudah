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
const generateButton = document.getElementById(
  'generateButton',
) as HTMLButtonElement;
const flashcardsContainer = document.getElementById(
  'flashcardsContainer',
) as HTMLDivElement;
const errorMessage = document.getElementById('errorMessage') as HTMLDivElement;
const exampleMessage = document.getElementById('exampleMessage') as HTMLDivElement;

// API Key Management Elements
const apiKeySection = document.getElementById('apiKeySection') as HTMLDivElement;
const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const saveApiKeyButton = document.getElementById(
  'saveApiKeyButton',
) as HTMLButtonElement;
const appContent = document.getElementById('appContent') as HTMLDivElement;
const changeApiKey = document.getElementById('changeApiKey') as HTMLAnchorElement;

let ai: GoogleGenAI | null = null;
const API_KEY_SESSION_STORAGE_KEY = 'GEMINI_API_KEY';

/**
 * Renders a list of flashcards to the container.
 * @param {Flashcard[]} cards The flashcards to display.
 */
function renderFlashcards(cards: Flashcard[]) {
  flashcardsContainer.innerHTML = ''; // Clear existing cards
  cards.forEach((flashcard, index) => {
    // Create card structure for flipping
    const cardDiv = document.createElement('div');
    cardDiv.classList.add('flashcard');
    cardDiv.dataset['index'] = index.toString();

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

    // Add click listener to toggle the 'flipped' class
    cardDiv.addEventListener('click', () => {
      cardDiv.classList.toggle('flipped');
    });
  });
}

/**
 * Initializes the GoogleGenAI client and updates the UI.
 * @param {string} apiKey The Gemini API key.
 */
function initializeApp(apiKey: string) {
  try {
    ai = new GoogleGenAI({ apiKey });
    apiKeySection.classList.add('hidden');
    appContent.classList.remove('hidden');
    errorMessage.textContent = '';
    exampleMessage.classList.add('hidden');
    flashcardsContainer.innerHTML = ''; // Clear default cards
  } catch (e) {
    errorMessage.textContent =
      'Failed to initialize with the provided API key. Please check the key and try again.';
    sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
  }
}

// On page load, check for a stored API key
document.addEventListener('DOMContentLoaded', () => {
  const storedApiKey = sessionStorage.getItem(API_KEY_SESSION_STORAGE_KEY);
  if (storedApiKey) {
    initializeApp(storedApiKey);
  } else {
    apiKeySection.classList.remove('hidden');
    appContent.classList.add('hidden');
    // Show default flashcards and message
    exampleMessage.classList.remove('hidden');
    renderFlashcards(DEFAULT_FLASHCARDS);
  }
});

// Event listener for saving the API key
saveApiKeyButton.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (apiKey) {
    sessionStorage.setItem(API_KEY_SESSION_STORAGE_KEY, apiKey);
    initializeApp(apiKey);
    apiKeyInput.value = ''; // Clear the input for security
  } else {
    errorMessage.textContent = 'Please enter a valid API key.';
  }
});

// Event listener for changing the API key
changeApiKey.addEventListener('click', (e) => {
  e.preventDefault();
  sessionStorage.removeItem(API_KEY_SESSION_STORAGE_KEY);
  ai = null;
  apiKeySection.classList.remove('hidden');
  appContent.classList.add('hidden');
  errorMessage.textContent = '';
  topicInput.value = ''; // Clear the textarea
  // Restore default state
  exampleMessage.classList.remove('hidden');
  renderFlashcards(DEFAULT_FLASHCARDS);
});

generateButton.addEventListener('click', async () => {
  if (!ai) {
    errorMessage.textContent =
      'API client is not initialized. Please set your API key.';
    return;
  }

  const topic = topicInput.value.trim();
  if (!topic) {
    errorMessage.textContent =
      'Please enter a topic or some terms and definitions.';
    flashcardsContainer.textContent = '';
    return;
  }

  errorMessage.textContent = 'Generating flashcards...';
  flashcardsContainer.textContent = '';
  generateButton.disabled = true; // Disable button during generation
  exampleMessage.classList.add('hidden'); // Hide example message

  try {
    const prompt = `Generate a list of flashcards for the topic of "${topic}". Each flashcard should have a term and a concise definition. Format the output as a list of "Term: Definition" pairs, with each pair on a new line. Ensure terms and definitions are distinct and clearly separated by a single colon. Here's an example output:
    Hello: Hola
    Goodbye: Adiós`;
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // Use optional chaining and nullish coalescing for safer access
    const responseText = result?.text ?? '';

    if (responseText) {
      const flashcards: Flashcard[] = responseText
        .split('\n')
        // Improved splitting and filtering
        .map((line) => {
          const parts = line.split(':');
          // Ensure there's a term and at least one part for definition
          if (parts.length >= 2 && parts[0].trim()) {
            const term = parts[0].trim();
            const definition = parts.slice(1).join(':').trim(); // Join remaining parts for definition
            if (definition) {
              return { term, definition };
            }
          }
          return null; // Return null for invalid lines
        })
        .filter((card): card is Flashcard => card !== null); // Filter out nulls and type guard

      if (flashcards.length > 0) {
        errorMessage.textContent = '';
        renderFlashcards(flashcards);
      } else {
        errorMessage.textContent =
          'No valid flashcards could be generated from the response. Please check the format.';
      }
    } else {
      errorMessage.textContent =
        'Failed to generate flashcards or received an empty response. Please try again.';
    }
  } catch (error: unknown) {
    console.error('Error generating content:', error);
    let detailedError =
      (error as Error)?.message || 'An unknown error occurred';
    if (detailedError.includes('API key not valid')) {
      detailedError =
        'Your API key is not valid. Please click "Change Key" to enter a new one.';
    }
    errorMessage.textContent = `An error occurred: ${detailedError}`;
    flashcardsContainer.textContent = ''; // Clear cards on error
  } finally {
    generateButton.disabled = false; // Re-enable button
  }
});