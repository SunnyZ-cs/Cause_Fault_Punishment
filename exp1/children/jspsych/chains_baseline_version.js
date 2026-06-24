// ════════════════════════════════════════════════════════════════════
//  PUNISHMENT STUDY — CHS jsPsych version
//
//  Paste the contents of this file directly into the
//  "jsPsych Experiment Code" editor on childrenhelpingscience.com.
//
//  CHS automatically loads all standard jsPsych v8 plugins and these
//  custom packages:
//    chsRecord  — VideoConfigPlugin, VideoConsentPlugin,
//                 StartRecordPlugin, StopRecordPlugin, TrialRecordExtension
//    chsSurvey  — ExitSurveyPlugin
// ════════════════════════════════════════════════════════════════════


// ── Inject CSS (CHS provides the HTML page; we inject styles at runtime) ──
const _style = document.createElement('style');
_style.textContent = `
    /* Override jsPsych content width to use more of the screen */
    .jspsych-content-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
    }
    .jspsych-content {
        max-width: 98% !important;
        width: 98% !important;
        margin: 0 auto !important;
    }

    /* All full-screen videos (scenario, intro, warmup, question) */
    .trial-video {
        display: block;
        width: 100%;
        max-height:70vh;
        margin: 0 auto;
        object-fit: contain;
    }

    /* Choice buttons row */
    #jspsych-html-button-response-btngroup {
        display: flex;
        justify-content: center;
        gap: 65px;
        margin-top: 8px;
    }

    /* Image choice buttons (applied via on_load in questionTrial) */
    .image-choice-btn {
        border: 3px solid #ccc !important;
        background: none !important;
        padding: 4px !important;
        border-radius: 10px !important;
        cursor: pointer !important;
        outline: none !important;
        transition: border-color 0.15s, transform 0.1s !important;
        /* Fixed uniform size so all buttons are the same box */
        width: 22vh !important;
        height: 22vh !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    .image-choice-btn:hover:not(:disabled) {
        border-color: #4a90d9 !important;
        transform: scale(1.05) !important;
    }
    .image-choice-btn:disabled { cursor: default !important; }
    .choice-img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
        pointer-events: none;
    }

    /* Continue button: larger, fixed to bottom-right corner */
    .continue-btn-group {
        position: fixed !important;
        bottom: 24px !important;
        right: 28px !important;
        margin: 0 !important;
        justify-content: flex-end !important;
    }
    .continue-btn-group .jspsych-btn {
        font-size: 1.3em !important;
        padding: 14px 44px !important;
    }

    /* Instructions */
    .instructions-box {
        max-width: 680px;
        margin: 30px auto;
        font-size: 1.1em;
        line-height: 1.7;
        text-align: left;
    }
    .instructions-box h2 { margin-bottom: 10px; }
    .instructions-box ul  { padding-left: 1.4em; }
`;
document.head.appendChild(_style);


// ════════════════════════════════════════════════════════════════════
//  CONFIG
// ════════════════════════════════════════════════════════════════════

const BASE = 'https://raw.githubusercontent.com/SunnyZ-cs/Cause_Fault_Punishment/main/exp1/children/';
const IMG  = src => BASE + 'img/' + src;
const VID  = src => BASE + 'mp4/' + src + '.mp4';

// Extract a short label from an image filename for data logging
// e.g. 'boy_bike_case_suzy.png' → 'suzy',  'yes.png' → 'yes'
function lbl(src) {
    return src.replace(/.*\//, '').replace('.png', '').split('_').pop();
}


// ════════════════════════════════════════════════════════════════════
//  SCENARIOS & RANDOMIZATION
// ════════════════════════════════════════════════════════════════════

const character_order_condition = Math.random() < 0.5 ? 0 : 1;
const cause_break_order = Math.random() < 0.5 ? ["caused", "break"] : ["break", "caused"];
const question_order = [...cause_break_order, "fault", "punish"];

const characters = {
    "bike": ["andy", "suzy"],
    "mirror": ["bobby", "sophia"]
};

const scenario_list = Math.random() < 0.5 ? ["bike", "mirror"] : ["mirror", "bike"];


// ════════════════════════════════════════════════════════════════════
//  INIT jsPsych
//  (CHS has already pre-wrapped initJsPsych to route data to its servers)
// ════════════════════════════════════════════════════════════════════

const jsPsych = initJsPsych();

// condition parameters are evaluated inline now


// ════════════════════════════════════════════════════════════════════
//  TRIAL BUILDERS
// ════════════════════════════════════════════════════════════════════

/**
 * videoTrial – plays a fullscreen video; the Continue button stays
 * disabled until the video finishes, so the experimenter controls pacing.
 */
function videoTrial(videoName, trialType) {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<video id="trial-video" class="trial-video"
                         src="${VID(videoName)}" autoplay playsinline></video>`,
        choices: ['Next'],
        on_load: function () {
            const group = document.getElementById('jspsych-html-button-response-btngroup');
            if (group) group.classList.add('continue-btn-group');
            const btn = group && group.querySelector('button');
            if (btn) {
                btn.disabled = true;
                document.getElementById('trial-video').addEventListener('ended', () => {
                    btn.disabled = false;
                });
                // Safety: enable after 5 min if the ended event never fires
                setTimeout(() => { btn.disabled = false; }, 300_000);
            }
        },
        data: { trial_type: trialType, video: videoName, condition: character_order_condition }
    };
}

/**
 * questionTrial – the key improvement over Lookit:
 *   1. Question image appears immediately at the top of the screen.
 *   2. Question audio plays in the background (invisible video element).
 *   3. After audio finishes, the two choice images fade in as clickable buttons.
 *
 * Response saved to data: 0 = left button, 1 = right button.
 */
function questionTrial({ videoName, leftImgSrc, rightImgSrc, questionType, scenarioId }) {
    const leftLabel  = lbl(leftImgSrc);
    const rightLabel = lbl(rightImgSrc);

    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<video id="q-audio" src="${VID(videoName)}"
                         class="trial-video" autoplay playsinline></video>`,
        choices: [
            `<img src="${leftImgSrc}"  class="choice-img" alt="${leftLabel}">`,
            `<img src="${rightImgSrc}" class="choice-img" alt="${rightLabel}">`
        ],
        on_load: function () {
            const group = document.getElementById('jspsych-html-button-response-btngroup');
            if (group) {
                group.querySelectorAll('button').forEach(b => {
                    b.classList.add('image-choice-btn');
                    b.disabled = true;
                    b.style.opacity = '0';
                    b.style.transition = 'opacity 0.3s';
                });
                const reveal = () => {
                    group.querySelectorAll('button').forEach(b => {
                        b.disabled = false;
                        b.style.opacity = '1';
                    });
                };
                document.getElementById('q-audio').addEventListener('ended', reveal);
                setTimeout(reveal, 300_000);
            }
        },
        data: {
            question_type: questionType,
            scenario:      scenarioId,
            condition:     character_order_condition,
            left_label:    leftLabel,
            right_label:   rightLabel,
            video:         videoName
        },
        response_ends_trial: true
    };
}


// ════════════════════════════════════════════════════════════════════
//  BUILD SCENARIO TIMELINE
// ════════════════════════════════════════════════════════════════════

function buildScenarioTimeline(scenarioKey) {
    const trials = [];
    const is_bike = scenarioKey === "bike";
    const intro_vid = "test_case_intro";
    const scenario_vid = is_bike ? "fence_scenario_boy_bike" : "mirror_scenario_girl_chair";
    const scenario_prefix = is_bike ? "fence_scenario_boy_bike" : "mirror_scenario_girl_chair";

    // 1. Intro video + scenario video (experimenter clicks Continue each time)
    trials.push(videoTrial(intro_vid, 'intro'));
    trials.push(videoTrial(scenario_vid, 'scenario'));

    // Determine character order for this scenario
    let scenario_chars = characters[scenarioKey];
    if (character_order_condition === 1) {
        scenario_chars = [scenario_chars[1], scenario_chars[0]];
    }

    // Generate the 8 Yes/No questions iteratively
    for (const q_type of question_order) {
        for (const character of scenario_chars) {
            // Mirror uses 'crack' instead of 'break' for the action question
            const type_for_file = (q_type === "break" && !is_bike) ? "crack" : q_type;
            const videoName = `${scenario_prefix}_${type_for_file}_${character}_question`;

            trials.push(questionTrial({
                videoName: videoName,
                leftImgSrc: IMG('yes.png'),
                rightImgSrc: IMG('no.png'),
                questionType: `${q_type}_${character}`,
                scenarioId: scenarioKey
            }));
        }
    }

    return trials;
}


// ════════════════════════════════════════════════════════════════════
//  WARMUP TIMELINE
// ════════════════════════════════════════════════════════════════════

/**
 * warmupQuestionTrial – like questionTrial but buttons are hidden until
 * the video finishes playing, then fade in.
 */
function warmupQuestionTrial({ videoName, leftImgSrc, rightImgSrc }) {
    const leftLabel  = lbl(leftImgSrc);
    const rightLabel = lbl(rightImgSrc);
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<video id="q-audio" src="${VID(videoName)}"
                         class="trial-video" autoplay playsinline></video>`,
        choices: [
            `<img src="${leftImgSrc}"  class="choice-img" alt="${leftLabel}">`,
            `<img src="${rightImgSrc}" class="choice-img" alt="${rightLabel}">`
        ],
        on_load: function () {
            const group = document.getElementById('jspsych-html-button-response-btngroup');
            if (group) {
                group.querySelectorAll('button').forEach(b => {
                    b.classList.add('image-choice-btn');
                    b.disabled = true;
                    b.style.opacity = '0';
                    b.style.transition = 'opacity 0.3s';
                });
                const reveal = () => {
                    group.querySelectorAll('button').forEach(b => {
                        b.disabled = false;
                        b.style.opacity = '1';
                    });
                };
                document.getElementById('q-audio').addEventListener('ended', reveal);
                setTimeout(reveal, 300_000); // safety fallback
            }
        },
        data: {
            question_type: 'warmup',
            scenario:      'warmup',
            condition:     character_order_condition,
            left_label:    leftLabel,
            right_label:   rightLabel,
            video:         videoName
        },
        response_ends_trial: true
    };
}

const warmupTimeline = [
    // Warmup questions: choice buttons appear after the video finishes
    warmupQuestionTrial({ videoName: 'warmup_yes_question_new',  leftImgSrc: IMG('yes.png'),  rightImgSrc: IMG('no.png')   }),
    warmupQuestionTrial({ videoName: 'warmup_part2_no_question',   leftImgSrc: IMG('yes.png'),  rightImgSrc: IMG('no.png')   }),
    // Warmup finish: video only, no choices
    videoTrial('warmup_finish', 'warmup_video')
];


// ════════════════════════════════════════════════════════════════════
//  CHS-SPECIFIC FRAMES
//  (These replace the Lookit EFP frames for webcam config, consent,
//   recording, and exit survey.)
// ════════════════════════════════════════════════════════════════════

const video_config = {
    type: chsRecord.VideoConfigPlugin
    // locale: 'zh'  // uncomment to change language
};

const video_consent = {
    type: chsRecord.VideoConsentPlugin,
    PIName:      'Ellen Markman',
    institution: 'The Markman Lab of Stanford University',
    PIContact:   'Ellen Markman at markman@stanford.edu',
    purpose:     'This study is about how children use causal verbs in language and how they think about causation and responsibility.',
    procedures:  'Your child will watch short videos and answer questions by clicking on pictures on the screen.',
    risk_statement: 'There are no expected risks to participation.',
    payment:     'After you finish the study, we will email you a $5 Amazon gift card within approximately 3–5 business days.',
    include_databrary: true
};

const instructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instructions-box">
            <h2>Overview</h2>
            <ul>
                <li>The study takes about 8–10 minutes.</li>
                <li>Your child will watch short videos and answer questions by clicking on pictures.</li>
                <li>There are no right or wrong answers.</li>
            </ul>
            <p><strong>For parents:</strong> Please help keep your child's attention,
               but don't tell them which answer to choose.</p>
        </div>`,
    choices: ['Start ▶'],
    data: { trial_type: 'instructions' }
};

const start_recording = { type: chsRecord.StartRecordPlugin };
const stop_recording  = { type: chsRecord.StopRecordPlugin  };


// ════════════════════════════════════════════════════════════════════
//  RUN THE EXPERIMENT
// ════════════════════════════════════════════════════════════════════

jsPsych.run([
    // ── Setup ──
    { type: jsPsychFullscreen, fullscreen_mode: true },
    video_config,
    video_consent,
    instructions,

    // ── Start recording ──
    start_recording,

    // ── Study introduction ──
    videoTrial('overall_study_intro', 'intro_video'),

    // ── Warmup ──
    ...warmupTimeline,

    // ── Record randomizations and setup scenarios ──
    {
        type: jsPsychHtmlButtonResponse,
        stimulus: '',
        choices: [],
        trial_duration: 0,
        data: {
            trial_type: 'randomization_info',
            scenario_order: scenario_list,
            question_order: question_order,
            character_order_condition: character_order_condition
        }
    },

    // ── Stop and restart recording between scenarios (mirrors original Lookit structure) ──
    stop_recording,
    start_recording,

    // ── Main experiment: Scenario 1 ──
    ...buildScenarioTimeline(scenario_list[0]),

    // ── Stop and restart recording between scenarios ──
    stop_recording,
    start_recording,

    // ── Main experiment: Scenario 2 ──
    ...buildScenarioTimeline(scenario_list[1]),

    // ── End ──
    stop_recording,
    videoTrial('overall_study_end', 'end_video'),
    { type: jsPsychFullscreen, fullscreen_mode: false, delay_after: 0 },
    { type: chsSurvey.ExitSurveyPlugin }
]);
