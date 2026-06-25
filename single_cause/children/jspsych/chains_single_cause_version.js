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

const BASE = 'https://raw.githubusercontent.com/SunnyZ-cs/Cause_Fault_Punishment/main/single_cause/children/';
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

const intent_condition = Math.random() < 0.5 ? "intentional" : "accidental";
const proximal_distal_order = Math.random() < 0.5 ? ["proximal", "distal"] : ["distal", "proximal"];
const cause_lexical_order = Math.random() < 0.5 ? ["cause", "lexical"] : ["lexical", "cause"];
const question_order = [...cause_lexical_order, "fault", "punish"];

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
        data: { trial_type: trialType, video: videoName, intent_condition: intent_condition }
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
            intent_condition: intent_condition,
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
    const intro_vid = "test_case_intro";
    const scenario_vid = `${scenarioKey}_${intent_condition}_scenario`;

    // 1. Intro video + scenario video (experimenter clicks Continue each time)
    trials.push(videoTrial(intro_vid, 'intro'));
    trials.push(videoTrial(scenario_vid, 'scenario'));

    // Generate the 4 Yes/No questions iteratively
    for (const q_type of question_order) {
        const videoName = `${scenarioKey}_${q_type}`;

        trials.push(questionTrial({
            videoName: videoName,
            leftImgSrc: IMG('yes.png'),
            rightImgSrc: IMG('no.png'),
            questionType: q_type,
            scenarioId: scenarioKey
        }));
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
            intent_condition: intent_condition,
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
    research_rights_statement: 'This research has been reviewed and approved by an Institutional Review Board (“IRB”), a group of people who oversee research involving humans as participants. Information to help you understand research is on-line at https://irb.stanford.edu/. You may talk to a IRB staff member at (650) 723-2480 or irb2-manager@lists.stanford.edu for any of the following: 1) Your questions, concerns, or complaints are not being answered by the research team; 2) you cannot reach the research team; 3) you want to talk to someone besides the research team; 4) you have questions about your rights as a research subject; 5) you want to get information or provide input about this research.',
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

const debrief_page = {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
        <div class="instructions-box" style="max-width: 800px; margin: 40px auto; text-align: left; line-height: 1.7; font-family: Arial, sans-serif;">
            <h1 style="text-align: center; margin-bottom: 30px; font-size: 2.2em; font-weight: normal; color: #333;">Thank you!</h1>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">This study is a follow-up to our previous research examining how children trace fault, responsibility, and punishment when a single agent directly causes an object to break or crack, and how they distinguish between intentional actions and accidental events.</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">In our previous work, we examined how children and adults assign responsibility in situations where a chain reaction leads to an object breaking (for example, Andy runs into Suzy with his bike, pushing her into a fence, causing it to break). We wanted to build on this work by examining a simpler case where a single character causes the outcome directly (e.g., Andy runs into the fence directly or Sophia falls into the mirror directly, without any intermediate characters).</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;">To avoid forcing participants to select someone to blame or punish when an event is purely accidental, we use a yes/no question format. Here, participants are asked individually about the single cause character (e.g., "Did Andy break the fence?" or "Did Sophia crack the mirror?"). We are interested in seeing how children's judgments of causation, fault, and punishment develop, particularly in how they contrast intentional acts with accidents.</p>
            
            <p style="margin-bottom: 1.5em; font-size: 1.05em; color: #444;"><strong>Compensation:</strong> As a reminder, you will receive a $5 Amazon.com gift card via email within approximately a week of completing the study.</p>
            
            <p style="margin-bottom: 2em; font-size: 1.05em; color: #444;">If you are interested in learning more about this topic, please visit our lab website: <a href="https://markmanlab.stanford.edu" target="_blank" style="color: #337ab7; text-decoration: none;">markmanlab.stanford.edu</a>, or check out this paper: 
            <a href="https://davdrose.github.io/assets/pdf/cause_fault_cog_sci.pdf" target="_blank" style="color: #337ab7; text-decoration: none;">https://davdrose.github.io/assets/pdf/cause_fault_cog_sci.pdf</a>. Thank you again for your participation!</p>
            
            <div style="text-align: center; margin-top: 30px; margin-bottom: 20px;">
                <button id="fb-share-btn" class="jspsych-btn" style="background-color: #3b5998; color: white; border: none; padding: 12px 24px; font-size: 1.1em; border-radius: 4px; cursor: pointer; margin-right: 15px; font-weight: bold;">Share this study on Facebook!</button>
                <button id="exit-btn" class="jspsych-btn" style="background-color: #5cb85c; color: white; border: none; padding: 12px 24px; font-size: 1.1em; border-radius: 4px; cursor: pointer; font-weight: bold;">Exit</button>
            </div>
        </div>
    `,
    choices: "NO_KEYS",
    on_load: function() {
        const fbBtn = document.getElementById('fb-share-btn');
        if (fbBtn) {
            fbBtn.addEventListener('click', function() {
                const studyUrl = window.location.href;
                const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(studyUrl)}`;
                window.open(fbShareUrl, '_blank');
            });
        }
        const exitBtn = document.getElementById('exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', function() {
                window.location.href = "https://childrenhelpingscience.com/studies/history/";
            });
        }
    },
    data: { trial_type: 'debrief' }
};


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
            intent_condition: intent_condition,
            cause_lexical_order: cause_lexical_order
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
    { type: chsSurvey.ExitSurveyPlugin },
    debrief_page
]);
