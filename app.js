'use strict';

// const BASE_API_URL = 'https://opentdb.com';
// const TOP_LEVEL_COMPONENTS = [
//   'js-intro', 'js-question', 'js-question-feedback', 
//   'js-outro', 'js-quiz-status'
// ];

let QUESTIONS = [];

// STORE functions
// ===============
class Store {
  constructor() {
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
    this.sessionToken = '';
  }

  resetStore() {
    this.page = 'intro';
    this.currentQuestionIndex = null;
    this.userAnswers = [];
    this.feedback = null;
  }

  getCurrentQuestion() {
    return QUESTIONS[this.currentQuestionIndex];
  }

  getProgress() {
    return {
      current: this.currentQuestionIndex + 1,
      total: QUESTIONS.length
    };
  }

  getQuestion(index) {
    return QUESTIONS[index];
  }

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

}

const STORE = new Store();

// API fetch functions + decorate functions for QUESTIONS
// =====================================================

const API = {
  BASE_API_URL: 'https://opentdb.com',

  TOP_LEVEL_COMPONENTS: [
    'js-intro', 'js-question', 'js-question-feedback', 
    'js-outro', 'js-quiz-status'
  ],

  buildBaseUrl(amt = 10, query = {}) {
    const url = new URL(this.BASE_API_URL + '/api.php');
    const queryKeys = Object.keys(query);
    url.searchParams.set('amount', amt);
  
    if (STORE.sessionToken) {
      url.searchParams.set('token', STORE.sessionToken);
    }
  
    queryKeys.forEach(key => url.searchParams.set(key, query[key]));
    return url;
  },

  buildTokenUrl(){
    return new URL(this.BASE_API_URL + '/api_token.php');
  },

  fetchToken(callback) {
    if (STORE.sessionToken) {
      return callback();
    }

    const url = this.buildTokenUrl();
    url.searchParams.set('command', 'request');
  
    $.getJSON(url, res => {
      STORE.sessionToken = res.token;
      callback();
    }, err => console.log(err));
  },

  fetchQuestions(amt, query, callback) {
    $.getJSON(this.buildBaseUrl(amt, query), callback, err => console.log(err.message));
  },

  seedQuestions(questions) {
    QUESTIONS.length = 0;
    questions.forEach(q => QUESTIONS.push(this.createQuestion(q)));
  },
  
  fetchAndSeedQuestions(amt, query, callback) {
    this.fetchQuestions(amt, query, res => {
      this.seedQuestions(res.results);
      callback();
    });
  },
  
  createQuestion(question) {
    return {
      text: question.question,
      answers: [ ...question.incorrect_answers, question.correct_answer ],
      correctAnswer: question.correct_answer
    };
  }
};

// HTML generator functions
// ========================

const GENERATOR = {
  generateAnswerItemHtml(answer) {
    return `
    <li class="answer-item">
      <input type="radio" name="answers" value="${answer}" />
      <span class="answer-text">${answer}</span>
    </li>
  `;
  },

  generateQuestionHtml(question) {
    const answers = question.answers
      .map((answer, index) => this.generateAnswerItemHtml(answer, index))
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
  },

  generateFeedbackHtml(feedback) {
    return `
      <p>
        ${feedback}
      </p>
      <button class="continue js-continue">Continue</button>
    `;
  },

};

// Render functions - uses `store` object to construct entire page every time it's run
// ===============

const RENDER = {
  render() {
    let html;
    this.hideAll();
  
    const question = STORE.getCurrentQuestion();
    const { feedback } = STORE; 
    const { current, total } = STORE.getProgress();
  
    $('.js-score').html(`<span>Score: ${STORE.getScore()}</span>`);
    $('.js-progress').html(`<span>Question ${current} of ${total}`);
  
    switch (STORE.page) {
    case 'intro':
      $('.js-intro').show();
      break;
      
    case 'question':
      html = GENERATOR.generateQuestionHtml(question);
      $('.js-question').html(html);
      $('.js-question').show();
      $('.quiz-status').show();
      break;
  
    case 'answer':
      html = GENERATOR.generateFeedbackHtml(feedback);
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
  },

  hideAll() {
    API.TOP_LEVEL_COMPONENTS.forEach(component => $(`.${component}`).hide());
  }

};

// Event handler functions
// =======================

const HANDLER = {
  handleStartQuiz() {
    STORE.resetStore();
    STORE.page = 'question';
    STORE.currentQuestionIndex = 0;
    const quantity = parseInt($('#js-question-quantity').find(':selected').val(), 10);
    API.fetchAndSeedQuestions(quantity, { type: 'multiple' }, () => {
      RENDER.render(); 
    });
  },

  handleSubmitAnswer(e) {
    e.preventDefault();
    const question = STORE.getCurrentQuestion();
    const selected = $('input:checked').val();
    STORE.userAnswers.push(selected);
    
    if (selected === question.correctAnswer) {
      STORE.feedback = 'You got it!';
    } else {
      STORE.feedback = `Too bad! The correct answer was: ${question.correctAnswer}`;
    }

    STORE.page = 'answer';
    RENDER.render();
  },

  handleNextQuestion() {
    if (STORE.currentQuestionIndex === QUESTIONS.length - 1) {
      STORE.page = 'outro';
      RENDER.render();
      return;
    }

    STORE.currentQuestionIndex++;
    STORE.page = 'question';
    RENDER.render();
  }
};

// On DOM Ready, run render() and add event listeners
$(() => {
  // Run first render
  RENDER.render();

  // Fetch session token, enable Start button when complete
  API.fetchToken(() => {
    $('.js-start').attr('disabled', false);
  });

  $('.js-intro, .js-outro').on('click', '.js-start', HANDLER.handleStartQuiz);
  $('.js-question').on('submit', HANDLER.handleSubmitAnswer);
  $('.js-question-feedback').on('click', '.js-continue', HANDLER.handleNextQuestion);
});