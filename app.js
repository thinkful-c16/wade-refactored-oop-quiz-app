'use strict';

const BASE_API_URL = 'https://opentdb.com';
const TOP_LEVEL_COMPONENTS = [
  'js-intro', 'js-question', 'js-question-feedback', 
  'js-outro', 'js-quiz-status'
];

let QUESTIONS = [];

// token is global because store is reset between quiz games, but token should persist for 
// entire session

// will initialize token upon quiz start, assigning it in STORE, and then allow to persist upon
// reseting quiz

// let sessionToken;

const STORE = {
  page: 'intro',
  currentQuestionIndex: null,
  userAnswers: [],
  feedback: null,
  sessionToken,

  resetStore() {
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
    this.sessionToken;
  },

  getCurrentQuestion() {
    return QUESTIONS[this.currentQuestionIndex];
  },

  getProgress() {
    return {
      current: this.currentQuestionIndex + 1,
      total: QUESTIONS.length
    };
  },

  getQuestion(index) {
    return QUESTIONS[index];
  },

  getScore() {
    return this.userAnswers.reduce((accumulator, userAnswer, index) => {
      const question = this.getQuestion(index);
  
      if (question.correctAnswer === userAnswer) {
        return accumulator + 1;
      } else {
        return accumulator;
      }
    }, 0);
  }

};

// const getInitialStore = function(){
//   return {
//     page: 'intro',
//     currentQuestionIndex: null,
//     userAnswers: [],
//     feedback: null,
//     sessionToken,
//   };
// };

// let store = getInitialStore();

// Helper functions
// ===============

// render helper function
const hideAll = function() {
  TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
};

// API helper function
const buildBaseUrl = function(amt = 10, query = {}) {
  const url = new URL(BASE_API_URL + '/api.php');
  const queryKeys = Object.keys(query);
  url.searchParams.set('amount', amt);

  if (STORE.sessionToken) {
    url.searchParams.set('token', STORE.sessionToken);
  }

  queryKeys.forEach(key => url.searchParams.set(key, query[key]));
  return url;
};

// API helper function
const buildTokenUrl = function() {
  return new URL(BASE_API_URL + '/api_token.php');
};

// API helper function
const fetchToken = function(callback) {
  if (STORE.sessionToken) {
    return callback();
  }

  const url = buildTokenUrl();
  url.searchParams.set('command', 'request');

  $.getJSON(url, res => {
    STORE.sessionToken = res.token;
    callback();
  }, err => console.log(err));
};

// API helper function
const fetchQuestions = function(amt, query, callback) {
  $.getJSON(buildBaseUrl(amt, query), callback, err => console.log(err.message));
};

// API function helper function
const seedQuestions = function(questions) {
  QUESTIONS.length = 0;
  questions.forEach(q => QUESTIONS.push(createQuestion(q)));
};

// API helper function
const fetchAndSeedQuestions = function(amt, query, callback) {
  fetchQuestions(amt, query, res => {
    seedQuestions(res.results);
    callback();
  });
};

// API helper function
const createQuestion = function(question) {
  return {
    text: question.question,
    answers: [ ...question.incorrect_answers, question.correct_answer ],
    correctAnswer: question.correct_answer
  };
};

// STORE CLASS
// const getScore = function() {
//   return store.userAnswers.reduce((accumulator, userAnswer, index) => {
//     const question = getQuestion(index);

//     if (question.correctAnswer === userAnswer) {
//       return accumulator + 1;
//     } else {
//       return accumulator;
//     }
//   }, 0);
// };

// STORE CLASS prototype function
// const getProgress = function() {
//   return {
//     current: store.currentQuestionIndex + 1,
//     total: QUESTIONS.length
//   };
// };
 
// STORE CLASS prototype function
// const getCurrentQuestion = function() {
//   return QUESTIONS[store.currentQuestionIndex];
// };

// // STORE CLASS prototype function
// const getQuestion = function(index) {
//   return QUESTIONS[index];
// };

// HTML generator functions
// ========================
const generateAnswerItemHtml = function(answer) {
  return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
};

const generateQuestionHtml = function(question) {
  const answers = question.answers
    .map((answer, index) => generateAnswerItemHtml(answer, index))
    .join('');

  return `
    <form>
      <fieldset>
        <legend class="question-text">${question.text}</legend>
          ${answers}
          <button type="submit">Submit</button>
      </fieldset>
    </form>
  `;
};

const generateFeedbackHtml = function(feedback) {
  return `
    <p>
      ${feedback}
    </p>
    <button class="continue js-continue">Continue</button>
  `;
};

// Render function - uses `store` object to construct entire page every time it's run
// ===============
const render = function() {
  let html;
  hideAll();

  const question = getCurrentQuestion();
  const { feedback } = store; 
  const { current, total } = getProgress();

  $('.js-score').html(`<span>Score: ${getScore()}</span>`);
  $('.js-progress').html(`<span>Question ${current} of ${total}`);

  switch (store.page) {
  case 'intro':
    $('.js-intro').show();
    break;
    
  case 'question':
    html = generateQuestionHtml(question);
    $('.js-question').html(html);
    $('.js-question').show();
    $('.quiz-status').show();
    break;

  case 'answer':
    html = generateFeedbackHtml(feedback);
    $('.js-question-feedback').html(html);
    $('.js-question-feedback').show();
    $('.quiz-status').show();
    break;

  case 'outro':
    $('.js-outro').show();
    $('.quiz-status').show();
    break;

  default:
    return;
  }
};

// Event handler functions
// =======================
const handleStartQuiz = function() {
  store = getInitialStore();
  store.page = 'question';
  store.currentQuestionIndex = 0;
  const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
  fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
    render();
  });
};

const handleSubmitAnswer = function(e) {
  e.preventDefault();
  const question = getCurrentQuestion();
  const selected = $('input:checked').val();
  store.userAnswers.push(selected);
  
  if (selected === question.correctAnswer) {
    store.feedback = 'You got it!';
  } else {
    store.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
  }

  store.page = 'answer';
  render();
};

const handleNextQuestion = function() {
  if (store.currentQuestionIndex === QUESTIONS.length - 1) {
    store.page = 'outro';
    render();
    return;
  }

  store.currentQuestionIndex++;
  store.page = 'question';
  render();
};

// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  render();

  // Fetch session token, enable Start button when complete
  fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });

  $('.js-intro, .js-outro').on('click', '.js-start', handleStartQuiz);
  $('.js-question').on('submit', handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', handleNextQuestion);
});