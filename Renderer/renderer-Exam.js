const electron = require('electron');
const { ipcRenderer } = electron;

const AssessmentConfig = require('../assessment-config.json');

var btnEndExam = document.querySelector('#btnEndExam');
var btnEndExamConfirmed = document.querySelector('#btnEndExamConfirmed');

let studentFirebaseIdKeyGlobal;
let currentQuestionNo;
let QuestionsGlobal;
let studentWebGuidGlobal;
let studentWebIdGlobal;
let TimeRemainingInSeconds = 0;

// let isExamEnded = false;
let isTimeUp = false;

let QuestionsMarkedForReview = [];

let ExamQuestionsObj = JSON.parse(localStorage.getItem("ExamQuestionsObj"));
let ExamSubType = localStorage.getItem("ExamSubType").toUpperCase();

function LoadExam(studentFirebaseIdKey, studentWebGuid, studentWebId) {
    studentWebGuidGlobal = studentWebGuid;
    studentWebIdGlobal = studentWebId;
    studentFirebaseIdKeyGlobal = studentFirebaseIdKey;

    QuestionsGlobal = ExamQuestionsObj.QuestionsJSON;
    var DurationInMinutes = ExamQuestionsObj.DurationInMinutes;

    if (ExamSubType !== undefined && ExamSubType !== "VIVA") {
        $('#theoryAnsH3').css('display', 'block');
    }
    else {
        $('#vivaAnsH3').css('display', 'block');
        $('#vivaAnsH4').css('display', 'block');
    }

    LoadQuestion(null, null);
    //START: Get Timer COunt
    ipcRenderer.send('timer:start', DurationInMinutes);
    //ipcRenderer.send('timer:start', 1);
    ipcRenderer.on('timer:count', (event, countTimer) => {
        //console.log('Count = ' + countTimer);
        $('#spnTimeRemaining').text(formatTimeRemaining(countTimer));
        TimeRemainingInSeconds = countTimer;
        timeLeftInExamFirebaseDisplay = countTimer;
        if (countTimer === 1) {
            isTimeUp = true;
            btnEndExamConfirmed.click();
        }
    });
    SetAnswerStatusOverviewBox();
    //End: Get Timer COunt
    // var UpdateExamTimeRemaining = setInterval(function () {
    //     if (isExamEnded === true) {
    //         clearInterval(UpdateExamTimeRemaining);
    //     }
    //     else {
    //         //Update the time left and current question number
    //         $.ajax(
    //             {
    //                 url: AssessmentConfig.UpdateExamTimeRemaining,
    //                 type: "POST",
    //                 data: {
    //                     StudentWebGuid: studentWebGuidGlobal,
    //                     StudentWebId: studentWebIdGlobal,
    //                     TimeRemainingInSeconds: String(TimeRemainingInSeconds),
    //                     CurrentQuestNo: String(currentQuestionNo)
    //                 },
    //                 success: function (result) {
    //                     console.log(result)
    //                 },
    //                 error: function (data) {
    //                     console.log('Oops, something went wrong in updating the exam time remaining.');
    //                 }
    //             });
    //     }
    // }, 10000);
}

function SetAnswerStatusOverviewBox() {
    console.log('In SetAnswerStatusOverviewBox()');
    if (ExamSubType !== undefined && ExamSubType !== "VIVA") { //Show the questions status overview only of the exam is not a VIVA
        var AnswerStatusOverviewBox = document.getElementById('AnswerStatusOverviewBox');
        AnswerStatusOverviewBox.innerHTML = '';
        QuestionsGlobal.forEach(function (quest, index) {
            var button = document.createElement("button");
            button.classList.add("OverviewBoxCircleClass");
            button.classList.add("bs-badge");
            if (quest.selectedOpt === null || quest.selectedOpt === undefined) {
                button.classList.add("badge-danger");
            }
            else {
                button.classList.add("badge-success");
            }
            if (QuestionsMarkedForReview.includes(index)) {
                button.style.backgroundColor = "orange";
            }

            button.style.padding = "1px";
            button.style.margin = "2px";
            // button.innerHTML = quest.id;
            button.innerHTML = index + 1;
            button.dataset.index = index;

            // button.dataset.tooltip = "tooltip";
            // button.dataset.placement = "right";
            // var attQuestion = document.createAttribute("data-original-title");
            // attQuestion.value = quest.question;
            // button.setAttributeNode(attQuestion);
            var attQuestion = document.createAttribute("title");
            attQuestion.value = quest.question;
            button.setAttributeNode(attQuestion);

            AnswerStatusOverviewBox.appendChild(button);

        });
        //$('[data-toggle="tooltip"]').tooltip();
        $('.OverviewBoxCircleClass').bind('click', function () {
            var index = $(this).data('index');
            LoadQuestion('review', index);
        });

        //Change the text of the review button for the current question:
        if (QuestionsMarkedForReview.includes(currentQuestionNo)) {
            $('#spnMarkQuestionForReviewText').text(' Unmark question for review');
            $('#ReviewFlagIcon').css('display', 'inline');
            $('#btnMarkForReview').addClass('btnMarkedForReview');
        }
        else {
            $('#spnMarkQuestionForReviewText').text(' Mark question for review');
            $('#ReviewFlagIcon').css('display', 'none');
            $('#btnMarkForReview').removeClass('btnMarkedForReview');
        }
    }
}

function formatTimeRemaining(count) {
    let HoursRemaining = count / (60 * 60);
    let MinutesRemaining = count / 60;
    let SecondsRemaining = 0;
    HoursRemaining = Math.floor(HoursRemaining);
    MinutesRemaining = Math.floor(MinutesRemaining);
    if (HoursRemaining >= 1) {
        //If there is atleast an hour, calculate the remaining minutes
        let hrsInMinutes = HoursRemaining * 60;
        let totalMinutes = Math.floor(count / 60);
        MinutesRemaining = totalMinutes - hrsInMinutes;

        let hrsInSeconds = hrsInMinutes * 60;
        let minsInSeconds = MinutesRemaining * 60;
        SecondsRemaining = count - (hrsInSeconds + minsInSeconds);
    }
    else if (MinutesRemaining >= 1) {
        SecondsRemaining = count - (MinutesRemaining * 60);
    }
    else {
        SecondsRemaining = count;
    }
    return String(HoursRemaining).padStart(2, "0") + ":" + String(MinutesRemaining).padStart(2, "0") + ":" + String(SecondsRemaining).padStart(2, "0");
}

$('#btnNext').click(function () {
    if (ExamSubType !== undefined && ExamSubType !== "VIVA") { //Always show a lightbox confirming that the student wants to go to the next question
        LoadQuestion('next');
    }
    else {
        $('#confirmNextQuestVivaModal').modal();
    }
});
$('#btnPrevious').click(function () {
    LoadQuestion('previous');
});
$('#btnEndExam').click(function () {
    LoadQuestion('end');
});
$('#btnFinishExam').click(function () {
    LoadQuestion('end');
});
$('#confirmNextQuestVivaModalYes').click(function () { //Only for Vivas
    LoadQuestion('next');
});
$('#btnMarkForReview').click(function () {
    //LoadQuestion('end');
    if (QuestionsMarkedForReview.includes(currentQuestionNo)) {
        var indPosition = QuestionsMarkedForReview.indexOf(currentQuestionNo);
        delete QuestionsMarkedForReview[indPosition];
    }
    else {
        QuestionsMarkedForReview.push(currentQuestionNo);
    }
    SetAnswerStatusOverviewBox();
});

function LoadQuestion(position, startIndex) {
    if (currentQuestionNo === undefined) //Start the exam
    {
        currentQuestionNo = 0;
        // if (startIndex) {
        //     currentQuestionNo = startIndex;
        // }
        var QuestionObj = QuestionsGlobal[currentQuestionNo];

        $('#spnQuestNo').text(currentQuestionNo + 1 + " of " + QuestionsGlobal.length);

        //Remove options which are null
        if (QuestionsGlobal[currentQuestionNo].A == null) {
            $('#spnOptA').closest('.radio-info').css('visibility', 'hidden');
        }
        else {
            $('#spnOptA').closest('.radio-info').css('visibility', 'visible');
        }
        if (QuestionsGlobal[currentQuestionNo].B == null) {
            $('#spnOptB').closest('.radio-info').css('visibility', 'hidden');
        }
        else {
            $('#spnOptB').closest('.radio-info').css('visibility', 'visible');
        }
        if (QuestionsGlobal[currentQuestionNo].C == null) {
            $('#spnOptC').closest('.radio-info').css('visibility', 'hidden');
        }
        else {
            $('#spnOptC').closest('.radio-info').css('visibility', 'visible');
        }
        if (QuestionsGlobal[currentQuestionNo].D == null) {
            $('#spnOptD').closest('.radio-info').css('visibility', 'hidden');
        }
        else {
            $('#spnOptD').closest('.radio-info').css('visibility', 'visible');
        }
        if (QuestionsGlobal[currentQuestionNo].E == null) {
            $('#spnOptE').closest('.radio-info').css('visibility', 'hidden');
        }
        else {
            $('#spnOptE').closest('.radio-info').css('visibility', 'visible');
        }
        if (QuestionsGlobal[currentQuestionNo].questionImg == null) {//set the quest img
            $('#imgQuestion').attr('src', '');
        }
        else {
            $('#imgQuestion').attr('src', QuestionsGlobal[currentQuestionNo].questionImg);
        }

        $('#lblQuestion').html(QuestionObj.question);
        $('#lblMarks').text('[' + QuestionObj.Marks + ' mark(s)]');
        $('#spnOptA').text(QuestionObj.A);
        $('#spnOptB').text(QuestionObj.B);
        $('#spnOptC').text(QuestionObj.C);
        $('#spnOptD').text(QuestionObj.D);
        $('#spnOptE').text(QuestionObj.E);

        $('.radio-info').removeClass('alert-warning');
        $('span').removeClass('checked'); //2 spans involved
        if (QuestionObj.selectedOpt) {
            if (QuestionObj.selectedOpt == "A") {
                $('#spnOptA').closest('.radio-info').addClass('alert-warning');
                $('#spnOptA').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
            }
            else if (QuestionObj.selectedOpt == "B") {
                $('#spnOptB').closest('.radio-info').addClass('alert-warning');
                $('#spnOptB').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
            }
            else if (QuestionObj.selectedOpt == "C") {
                $('#spnOptC').closest('.radio-info').addClass('alert-warning');
                $('#spnOptC').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
            }
            else if (QuestionObj.selectedOpt == "D") {
                $('#spnOptD').closest('.radio-info').addClass('alert-warning');
                $('#spnOptD').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
            }
            else if (QuestionObj.selectedOpt == "E") {
                $('#spnOptE').closest('.radio-info').addClass('alert-warning');
                $('#spnOptE').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
            }
        }
        $('#btnPrevious').css('visibility', 'hidden');
    }
    else { //Save the answer and load the next question
        var QuestionObj = QuestionsGlobal[currentQuestionNo];

        let selectedOpt;
        if ($('#spnOptA').hasClass('checked')) {
            selectedOpt = 'A';
        }
        else if ($('#spnOptB').hasClass('checked')) {
            selectedOpt = 'B';
        }
        else if ($('#spnOptC').hasClass('checked')) {
            selectedOpt = 'C';
        }
        else if ($('#spnOptD').hasClass('checked')) {
            selectedOpt = 'D';
        }
        else if ($('#spnOptE').hasClass('checked')) {
            selectedOpt = 'E';
        }
        var QuestionObj = QuestionsGlobal[currentQuestionNo];
        if (selectedOpt) {
            let isAnswerCorrect;
            if (QuestionObj.CorrectAns == selectedOpt) {
                isAnswerCorrect = true;
            }
            else {
                isAnswerCorrect = true;
            }
            QuestionObj.selectedOpt = selectedOpt;
            QuestionObj.isAnswerCorrect = isAnswerCorrect;
        }
        else {
            QuestionObj.isAnswerCorrect = true
        }
        QuestionsGlobal[currentQuestionNo] = QuestionObj;
        //The following was commented to reduce server calls.
        // try {
        //     $.ajax(
        //         {
        //             url: AssessmentConfig.UpdateExamAnswer,
        //             type: "POST",
        //             data: {
        //                 StudentWebGuid: studentWebGuidGlobal,
        //                 StudentWebId: studentWebIdGlobal,
        //                 ExamAnswersJSON: JSON.stringify(QuestionsGlobal)
        //             },
        //             success: function (result) {
        //                 console.log(result);
        //             },
        //             error: function (data) {
        //                 console.log('Oops, something went wrong in updating the exam answer.');
        //             }
        //         });
        // }
        // catch (e) {
        //     console.log(e);
        // }

        if ((position === "next" && currentQuestionNo + 2 <= QuestionsGlobal.length) || (position === "previous" && currentQuestionNo > 0) || position === "review") { //Make sure that the index is in range
            var questionCurrentIndexRef = firebase.database().ref('webrtc/students/' + studentFirebaseIdKeyGlobal + '/questionCurrentIndex');
            if (position == "next") {
                ++currentQuestionNo;
            }
            else if (position == "previous") {
                +--currentQuestionNo;
            }
            else if (position == "review") {
                if (startIndex !== undefined) {
                    currentQuestionNo = startIndex;
                }
            }
            //Remove options which are null
            if (QuestionsGlobal[currentQuestionNo].A == null) {
                $('#spnOptA').closest('.radio-info').css('visibility', 'hidden');
            }
            else {
                $('#spnOptA').closest('.radio-info').css('visibility', 'visible');
            }
            if (QuestionsGlobal[currentQuestionNo].B == null) {
                $('#spnOptB').closest('.radio-info').css('visibility', 'hidden');
            }
            else {
                $('#spnOptB').closest('.radio-info').css('visibility', 'visible');
            }
            if (QuestionsGlobal[currentQuestionNo].C == null) {
                $('#spnOptC').closest('.radio-info').css('visibility', 'hidden');
            }
            else {
                $('#spnOptC').closest('.radio-info').css('visibility', 'visible');
            }
            if (QuestionsGlobal[currentQuestionNo].D == null) {
                $('#spnOptD').closest('.radio-info').css('visibility', 'hidden');
            }
            else {
                $('#spnOptD').closest('.radio-info').css('visibility', 'visible');
            }
            if (QuestionsGlobal[currentQuestionNo].E == null) {
                $('#spnOptE').closest('.radio-info').css('visibility', 'hidden');
            }
            else {
                $('#spnOptE').closest('.radio-info').css('visibility', 'visible');
            }
            if (QuestionsGlobal[currentQuestionNo].questionImg == null) {//set the quest img
                $('#imgQuestion').attr('src', '');
            }
            else {
                $('#imgQuestion').attr('src', QuestionsGlobal[currentQuestionNo].questionImg);
            }
            //questionCurrentIndexRef.set(currentQuestionNo, function () {
            questionCurrentIndexRef.set(currentQuestionNo);
            $('#spnQuestNo').text(currentQuestionNo + 1 + " of " + QuestionsGlobal.length);
            //Go to the next question:
            let nextQuestionObj = QuestionsGlobal[currentQuestionNo];
            $('#lblQuestion').html(nextQuestionObj.question);
            $('#lblMarks').text('[' + nextQuestionObj.Marks + ' mark(s)]');
            $('#spnOptA').text(nextQuestionObj.A);
            $('#spnOptB').text(nextQuestionObj.B);
            $('#spnOptC').text(nextQuestionObj.C);
            $('#spnOptD').text(nextQuestionObj.D);
            $('#spnOptE').text(nextQuestionObj.E);

            $('.radio-info').removeClass('alert-warning');
            $('span').removeClass('checked'); //2 spans involved
            if (nextQuestionObj.selectedOpt) {
                if (nextQuestionObj.selectedOpt == "A") {
                    $('#spnOptA').closest('.radio-info').addClass('alert-warning');
                    $('#spnOptA').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
                }
                else if (nextQuestionObj.selectedOpt == "B") {
                    $('#spnOptB').closest('.radio-info').addClass('alert-warning');
                    $('#spnOptB').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
                }
                else if (nextQuestionObj.selectedOpt == "C") {
                    $('#spnOptC').closest('.radio-info').addClass('alert-warning');
                    $('#spnOptC').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
                }
                else if (nextQuestionObj.selectedOpt == "D") {
                    $('#spnOptD').closest('.radio-info').addClass('alert-warning');
                    $('#spnOptD').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
                }
                else if (nextQuestionObj.selectedOpt == "E") {
                    $('#spnOptE').closest('.radio-info').addClass('alert-warning');
                    $('#spnOptE').closest('.radio-info').find('span').addClass('checked'); //2 spans involved
                }
            }
            $('#btnPrevious').css('visibility', 'visible');
            $('#btnNext').css('visibility', 'visible');
            $('#btnFinishExam').css('visibility', 'hidden');
            //});
            if (position === "next" && currentQuestionNo + 1 == QuestionsGlobal.length) {
                $('#btnNext').css('visibility', 'hidden');
                $('#btnFinishExam').css('visibility', 'visible');
            }
            else if (position === "previous" && currentQuestionNo == 0) {
                $('#btnPrevious').css('visibility', 'hidden');
            }
            else if (position === "review" && currentQuestionNo + 1 == QuestionsGlobal.length) {
                $('#btnNext').css('visibility', 'hidden');
                $('#btnFinishExam').css('visibility', 'visible');
            }
            else if (position === "review" && currentQuestionNo == 0) {
                $('#btnPrevious').css('visibility', 'hidden');
            }
            if (ExamSubType !== undefined && ExamSubType === "VIVA") { //Always hide this for vivas
                $('#btnPrevious').css('visibility', 'hidden');
            }
        }
        // else if(position === "end"){ //Save the Live Question Obj to the Exam obj
        //     var e = firebase.database().ref('exams/students/' + studentFirebaseIdKeyGlobal + '/questions');
        //     e.set(Questions);
        // }
        //});
    }
    //});
    SetAnswerStatusOverviewBox();

}

btnEndExamConfirmed.addEventListener("click", function () {
    isExamEnded = true;
    let selectedOpt;
    if ($('#spnOptA').hasClass('checked')) {
        selectedOpt = 'A';
    }
    else if ($('#spnOptB').hasClass('checked')) {
        selectedOpt = 'B';
    }
    else if ($('#spnOptC').hasClass('checked')) {
        selectedOpt = 'C';
    }
    else if ($('#spnOptD').hasClass('checked')) {
        selectedOpt = 'D';
    }
    else if ($('#spnOptE').hasClass('checked')) {
        selectedOpt = 'E';
    }
    var QuestionObj = QuestionsGlobal[currentQuestionNo];
    if (selectedOpt) {
        let isAnswerCorrect;
        if (QuestionObj.CorrectAns == selectedOpt) {
            isAnswerCorrect = true;
        }
        else {
            isAnswerCorrect = true;
        }
        QuestionObj.selectedOpt = selectedOpt;
        QuestionObj.isAnswerCorrect = isAnswerCorrect;
    }
    else {
        QuestionObj.isAnswerCorrect = true
    }
    QuestionsGlobal[currentQuestionNo] = QuestionObj;
    try {
        var endExamInterval = setInterval(function () {
            if (formDataWebCamError.length == 0) { //Only if all videos have been uploaded
                $.ajax(
                    {
                        url: AssessmentConfig.UpdateExamAnswer,
                        type: "POST",
                        data: {
                            StudentWebGuid: studentWebGuidGlobal,
                            StudentWebId: studentWebIdGlobal,
                            ExamAnswersJSON: JSON.stringify(QuestionsGlobal)
                        },
                        success: function (result) {
                            console.log(result);
                            if (!result.includes("Error")) { //If this contains Error, try again
                                $.ajax(
                                    {
                                        url: AssessmentConfig.EndExam,
                                        type: "POST",
                                        data: {
                                            StudentWebGuid: studentWebGuidGlobal,
                                            StudentWebId: studentWebIdGlobal,
                                            isTimeUp: isTimeUp
                                        },
                                        success: function (respEndExam) {
                                            if (!respEndExam.includes("Error")) { //If this contains Error, try again
                                                console.log('resp from EndExam.ashx: ' + respEndExam);
                                                if (formDataWebCamError.length == 0) {
                                                    clearInterval(endExamInterval);
                                                    //location.href = "exam-completed.html";
                                                    window.location = 'exam-completed.html';
                                                }
                                                else {
                                                    console.log("In renderer-Exam.js- waiting - formDataWebCamError.length > 0 !!!");
                                                }
                                            }
                                        },
                                        error: function (data) {
                                            console.log('Oops, something went wrong in EndExam.ashx.');
                                        }
                                    });
                            }
                        },
                        error: function (data) {
                            console.log('Oops, something went wrong in UpdateExamAnswer while ending exam.');
                        }
                    });
            }
        }, 10000);
    }
    catch (e) {
        console.log(e);
    }
});

module.exports = {
    'LoadExamStart': LoadExam
}