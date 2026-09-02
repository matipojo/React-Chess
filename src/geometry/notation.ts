export const COACH_GAN_RULE =
  "Figure objects and constructions MUST use Latin GAN only: △ABC, ∠A, AB, h(A,BC), m(A,BC), g(△ABC), b(A), circ(ABC), inc(ABC), mid(BC), mark(90,C), fit(△ABC ≅ △DEF), rot(A,90,△ABC), move(C,1,2). Words may be in any language, but the token itself must stay Latin so it can link, highlight, and Play. The centroid of △ABC is G; draw medians with m(A,BC) then label it with g(△ABC), or let the student click the unlabeled intersection and set correct to [\"G\"].";

export const TRIANGLE_WAIT_TURN_RULE =
  "After anything the student should see on the figure (coach text, a construction, a demo), call how_to_ask_the_user with no arguments, then follow the returned instructions: render clickable buttons in this chat with your visualization UI. Do not create an HTML file or a new canvas — this triangle page is the figure. Do not use a numbered list. Do not put the question on the webpage. For a puzzle or exam, call how_to_offer_a_hint, then add-lesson-step with type riddle (question + correct GAN objects such as G or ∠C). The riddle prompt must not spoil how to solve; the student taps Give me a hint in this chat if they want a nudge.";

export const TRIANGLE_EXAMPLE_PROMPTS = [
  "Show a right triangle and the altitude to the hypotenuse",
  "Teach SAS congruence with two triangles",
  "Quiz me on the centroid",
];
