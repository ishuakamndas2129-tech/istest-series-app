import { questionTopics as importedQuestionTopics, starterTests } from './question-bank.js';

const questionBank = window.questionBank;
const questionBankTopics = questionBank?.topics?.length ? questionBank.topics : [];
const questionTopics = [...importedQuestionTopics, ...questionBankTopics].length > 0
  ? [...importedQuestionTopics, ...questionBankTopics]
  : [{ id: "simplification", title: "Simplification", questions: [] }];

const pdfTests = [];

questionTopics.forEach((topic) => {
  if (topic.sources?.length) {
    topic.sources.forEach((source) => {
      pdfTests.push({
        id: source.id,
        title: source.title,
        description: `Topic: ${topic.title}`,
        questions: source.questions,
      });
    });
    return;
  }

  const setSize = topic.setSize || 50;

  for (let index = 0; index < topic.questions.length; index += setSize) {
    const setNumber = Math.floor(index / setSize) + 1;
    const questions = topic.questions.slice(index, index + setSize);
    const firstQuestion = questions[0].number;
    const lastQuestion = questions[questions.length - 1].number;

    pdfTests.push({
      id: `${topic.id}-${setNumber}`,
      title: `${topic.title} Set ${setNumber}`,
      description: `Questions ${firstQuestion}-${lastQuestion}.`,
      questions,
    });
  }
});

const tests = pdfTests.length > 0 ? [...pdfTests, ...starterTests] : starterTests;

const loginScreen = document.querySelector("#loginScreen");
const startScreen = document.querySelector("#startScreen");
const quizScreen = document.querySelector("#quizScreen");
const resultScreen = document.querySelector("#resultScreen");
const reviewScreen = document.querySelector("#reviewScreen");
const loginForm = document.querySelector("#loginForm");
const userId = document.querySelector("#userId");
const password = document.querySelector("#password");
const loginError = document.querySelector("#loginError");
const userPanel = document.querySelector("#userPanel");
const signedInName = document.querySelector("#signedInName");
const logoutButton = document.querySelector("#logoutButton");
const topBackButton = document.querySelector("#topBackButton");
const testList = document.querySelector("#testList");
const testName = document.querySelector("#testName");
const questionTitle = document.querySelector("#questionTitle");
const questionCounter = document.querySelector("#questionCounter");
const timerText = document.querySelector("#timerText");
const progressBar = document.querySelector("#progressBar");
const answers = document.querySelector("#answers");
const questionPalette = document.querySelector("#questionPalette");
const pauseNotice = document.querySelector("#pauseNotice");
const previousButton = document.querySelector("#previousButton");
const clearButton = document.querySelector("#clearButton");
const markButton = document.querySelector("#markButton");
const errorButton = document.querySelector("#errorButton");
const errorNotice = document.querySelector("#errorNotice");
const pauseButton = document.querySelector("#pauseButton");
const nextButton = document.querySelector("#nextButton");
const submitPaletteButton = document.querySelector("#submitPaletteButton");
const hidePaletteButton = document.querySelector("#hidePaletteButton");
const showPaletteButton = document.querySelector("#showPaletteButton");
const reviewButton = document.querySelector("#reviewButton");
const homeButton = document.querySelector("#homeButton");
const scoreText = document.querySelector("#scoreText");
const scoreMessage = document.querySelector("#scoreMessage");
const reviewList = document.querySelector("#reviewList");
const reviewSummary = document.querySelector("#reviewSummary");

const TEST_TIME_SECONDS = 45 * 60;
const USER_SESSION_KEY = "testsprintUserSession";
const VALID_USERS = {
  student1: { name: "Student One", password: "abc123" },
  student2: { name: "Student Two", password: "xyz789" },
  isha2001: { name: "Isha Das", password: "isha2001" },
  guest: { name: "Guest User", password: "guest" },
};

let selectedTest = tests[0];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let markedQuestions = [];
let errorQuestions = [];
let remainingSeconds = TEST_TIME_SECONDS;
let timerId = null;
let isPaused = false;
let isPaletteHidden = false;

function showScreen(screen) {
  [loginScreen, startScreen, quizScreen, resultScreen, reviewScreen].forEach((item) => item.classList.remove("active"));
  screen.classList.add("active");
  renderPauseState();
}

function showSignedInStudent(name) {
  signedInName.textContent = name;
  userPanel.hidden = false;
  loginError.hidden = true;
  showScreen(startScreen);
}

function signIn(event) {
  event.preventDefault();
  const id = userId.value.trim();
  const passwordValue = password.value;
  const user = VALID_USERS[id];

  if (!user || user.password !== passwordValue) {
    loginError.hidden = false;
    return;
  }

  const session = { id, name: user.name };
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
  loginForm.reset();
  showSignedInStudent(user.name);
}

function loadSavedStudent() {
  const savedSession = localStorage.getItem(USER_SESSION_KEY);

  if (!savedSession) return;

  try {
    const session = JSON.parse(savedSession);
    if (session && session.name) {
      showSignedInStudent(session.name);
    }
  } catch (error) {
    localStorage.removeItem(USER_SESSION_KEY);
  }
}

function logout() {
  stopTimer();
  localStorage.removeItem(USER_SESSION_KEY);
  userPanel.hidden = true;
  showScreen(loginScreen);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function sanitizeHtml(value) {
  // Allow <sup> and <sub> tags, escape everything else
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/&lt;sup&gt;/g, "<sup>")
    .replace(/&lt;\/sup&gt;/g, "</sup>")
    .replace(/&lt;sub&gt;/g, "<sub>")
    .replace(/&lt;\/sub&gt;/g, "</sub>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTimer() {
  timerText.textContent = formatTime(remainingSeconds);
  timerText.classList.toggle("warning", remainingSeconds <= 5 * 60);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function runTimer() {
  stopTimer();
  timerId = setInterval(() => {
    remainingSeconds -= 1;
    renderTimer();

    if (remainingSeconds <= 0) {
      showResult(true);
    }
  }, 1000);
}

function renderPauseState() {
  const quizIsActive = quizScreen.classList.contains("active");

  pauseButton.textContent = isPaused ? ">" : "II";
  pauseButton.setAttribute("aria-label", isPaused ? "Resume test" : "Pause test");
  pauseButton.hidden = !quizIsActive;
  timerText.hidden = !quizIsActive;
  topBackButton.hidden = loginScreen.classList.contains("active") || startScreen.classList.contains("active");
  pauseNotice.hidden = !isPaused;
  quizScreen.classList.toggle("paused", isPaused);
  previousButton.disabled = isPaused || currentQuestionIndex === 0;
  clearButton.disabled = isPaused;
  markButton.disabled = isPaused;
  nextButton.disabled = isPaused;
}

function startTimer() {
  isPaused = false;
  remainingSeconds = TEST_TIME_SECONDS;
  renderTimer();
  renderPauseState();
  runTimer();
}

function togglePause() {
  isPaused = !isPaused;

  if (isPaused) {
    stopTimer();
  } else {
    runTimer();
  }

  renderPauseState();
}

function renderTests() {
  testList.innerHTML = tests.map((test) => `
    <button class="test-card" type="button" data-test-id="${test.id}">
      <h3>${escapeHtml(test.title)}</h3>
      <p>${escapeHtml(test.description)}</p>
      <span>${test.questions.length} questions</span>
    </button>
  `).join("");
}

function startTest(testId) {
  selectedTest = tests.find((test) => test.id === testId);
  currentQuestionIndex = 0;
  selectedAnswers = Array(selectedTest.questions.length).fill(null);
  markedQuestions = Array(selectedTest.questions.length).fill(false);
  errorQuestions = Array(selectedTest.questions.length).fill(false);
  isPaletteHidden = false;
  errorNotice.hidden = true;
  showScreen(quizScreen);
  renderQuestion();
  startTimer();
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function renderQuestion() {
  const question = selectedTest.questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const progress = (questionNumber / selectedTest.questions.length) * 100;
  const hasError = errorQuestions[currentQuestionIndex];
  const wordCount = countWords(question.question);
  const isLongQuestion = wordCount > 25;

  testName.textContent = selectedTest.title;
  questionTitle.innerHTML = sanitizeHtml(question.question);
  questionTitle.classList.toggle("long-question", isLongQuestion);
  progressBar.style.width = `${progress}%`;
  answers.innerHTML = question.options.map((option, index) => {
    const selectedClass = selectedAnswers[currentQuestionIndex] === index ? "selected" : "";
    return `<button class="answer-button ${selectedClass}" type="button" data-answer-index="${index}">${sanitizeHtml(option)}</button>`;
  }).join("");

  previousButton.disabled = currentQuestionIndex === 0;
  markButton.textContent = markedQuestions[currentQuestionIndex] ? "Unmark" : "Mark";
  errorButton.textContent = "!";
  errorButton.title = hasError ? "Remove the error report for this question" : "Report an error for this question";
  errorButton.classList.toggle("active", hasError);
  errorButton.disabled = isPaused;
  errorNotice.hidden = !hasError;
  errorNotice.textContent = hasError ? "This question has been flagged for review." : "";
  nextButton.textContent = currentQuestionIndex === selectedTest.questions.length - 1 ? "Submit" : "Next";
  renderQuestionPalette();
  renderPaletteStats();
  renderPaletteVisibility();
  renderPauseState();
}

function renderQuestionPalette() {
  questionPalette.innerHTML = selectedTest.questions.map((question, index) => {
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = selectedAnswers[index] !== null;
    const isMarked = markedQuestions[index];
    const isError = errorQuestions[index];
    const classes = [
      "palette-button",
      isCurrent ? "current" : "",
      isAnswered ? "answered" : "",
      isMarked ? "marked" : "",
      isError ? "error" : "",
    ].filter(Boolean).join(" ");

    return `<button class="${classes}" type="button" data-question-index="${index}">${index + 1}</button>`;
  }).join("");
}

function renderPaletteStats() {
  if (!selectedTest) return;

  const total = selectedTest.questions.length;
  const attempted = selectedAnswers.filter((answer) => answer !== null).length;
  const marked = markedQuestions.filter(Boolean).length;

  totalCount.textContent = total;
  attemptedCount.textContent = attempted;
  notAttemptedCount.textContent = total - attempted;
  markedCount.textContent = marked;
}

function renderPaletteVisibility() {
  quizScreen.classList.toggle("palette-hidden", isPaletteHidden);
  hidePaletteButton.textContent = isPaletteHidden ? "Show" : "Hide";
  showPaletteButton.hidden = !isPaletteHidden;
}

function chooseAnswer(answerIndex) {
  if (isPaused) return;

  selectedAnswers[currentQuestionIndex] = Number(answerIndex);
  renderQuestion();
}

function clearResponse() {
  if (isPaused) return;

  selectedAnswers[currentQuestionIndex] = null;
  renderQuestion();
}

function toggleMark() {
  if (isPaused) return;

  markedQuestions[currentQuestionIndex] = !markedQuestions[currentQuestionIndex];
  renderQuestion();
}

function toggleError() {
  if (isPaused) return;

  errorQuestions[currentQuestionIndex] = !errorQuestions[currentQuestionIndex];
  renderQuestion();
}

function togglePalette() {
  isPaletteHidden = !isPaletteHidden;
  renderPaletteVisibility();
}

function goNext() {
  if (isPaused) return;

  if (currentQuestionIndex < selectedTest.questions.length - 1) {
    currentQuestionIndex += 1;
    renderQuestion();
    return;
  }
  showResult();
}

function goPrevious() {
  if (isPaused) return;

  if (currentQuestionIndex > 0) {
    currentQuestionIndex -= 1;
    renderQuestion();
  }
}

function calculateResult() {
  return selectedTest.questions.reduce(
    (result, question, index) => {
      const selectedAnswer = selectedAnswers[index];

      if (selectedAnswer === null) {
        result.unanswered += 1;
      } else if (selectedAnswer === question.answer) {
        result.correct += 1;
        result.marks += 1;
      } else {
        result.incorrect += 1;
        result.marks -= 0.25;
      }

      return result;
    },
    { correct: 0, incorrect: 0, unanswered: 0, marks: 0 }
  );
}

function showResult(timedOut = false) {
  stopTimer();
  isPaused = false;
  const result = calculateResult();
  const total = selectedTest.questions.length;
  const percentage = Math.round((result.marks / total) * 100);
  const marks = Number.isInteger(result.marks) ? result.marks : result.marks.toFixed(2);

  scoreText.textContent = `${marks}/${total} marks`;
  scoreMessage.textContent = timedOut
    ? `Time is up. Correct: ${result.correct}, incorrect: ${result.incorrect}, unanswered: ${result.unanswered}. Score: ${percentage}%.`
    : `Correct: ${result.correct}, incorrect: ${result.incorrect}, unanswered: ${result.unanswered}. Score: ${percentage}%.`;
  showScreen(resultScreen);
}

function showReview() {
  const errors = errorQuestions.filter(Boolean).length;
  reviewSummary.textContent = errors > 0 ? `${errors} question(s) flagged for review.` : '';
  reviewList.innerHTML = selectedTest.questions.map((question, index) => {
    const userAnswerIndex = selectedAnswers[index];
    const isCorrect = userAnswerIndex === question.answer;
    const userAnswer = userAnswerIndex === null ? "Not answered" : question.options[userAnswerIndex];
    const correctAnswer = question.options[question.answer];
    const isError = errorQuestions[index];
    const errorNote = isError ? '<p class="review-answer error-flag"><strong>Error reported:</strong> This question was flagged for review.</p>' : '';
    return `
      <article class="review-item">
        <h3>${index + 1}. ${sanitizeHtml(question.question)}</h3>
        <p class="review-answer ${isCorrect ? "correct" : "wrong"}">${isCorrect ? "Correct" : "Needs practice"}</p>
        <p class="review-answer"><strong>Your answer:</strong> ${escapeHtml(userAnswer)}</p>
        <p class="review-answer"><strong>Correct answer:</strong> ${escapeHtml(correctAnswer)}</p>
        ${errorNote}
      </article>
    `;
  }).join("");
  showScreen(reviewScreen);
}

function restart() {
  stopTimer();
  isPaused = false;
  isPaletteHidden = false;
  currentQuestionIndex = 0;
  selectedAnswers = [];
  markedQuestions = [];
  errorQuestions = [];
  remainingSeconds = TEST_TIME_SECONDS;
  renderTimer();
  showScreen(startScreen);
}

function keepBrowserBackInsideApp() {
  window.history.pushState({ screen: "testsprint" }, "", window.location.href);
}

function handleBrowserBack() {
  keepBrowserBackInsideApp();

  if (loginScreen.classList.contains("active")) {
    showScreen(loginScreen);
    return;
  }

  restart();
}

testList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-test-id]");
  if (card) startTest(card.dataset.testId);
});
answers.addEventListener("click", (event) => {
  const answer = event.target.closest("[data-answer-index]");
  if (answer) chooseAnswer(answer.dataset.answerIndex);
});
questionPalette.addEventListener("click", (event) => {
  if (isPaused) return;

  const button = event.target.closest("[data-question-index]");
  if (!button) return;

  currentQuestionIndex = Number(button.dataset.questionIndex);
  renderQuestion();
});
nextButton.addEventListener("click", goNext);
previousButton.addEventListener("click", goPrevious);
clearButton.addEventListener("click", clearResponse);
markButton.addEventListener("click", toggleMark);
errorButton.addEventListener("click", toggleError);
pauseButton.addEventListener("click", togglePause);
topBackButton.addEventListener("click", restart);
hidePaletteButton.addEventListener("click", togglePalette);
showPaletteButton.addEventListener("click", togglePalette);
reviewButton.addEventListener("click", showReview);
homeButton.addEventListener("click", restart);
logoutButton.addEventListener("click", logout);
submitPaletteButton.addEventListener("click", showResult);
loginForm.addEventListener("submit", signIn);
window.addEventListener("popstate", handleBrowserBack);
keepBrowserBackInsideApp();
renderTests();
renderTimer();
loadSavedStudent();
