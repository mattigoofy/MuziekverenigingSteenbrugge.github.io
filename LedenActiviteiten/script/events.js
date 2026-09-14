import { state } from "./state.js";

export { createEvent, moveToNextPage, updateScore, updateEvents };

function createEvent(eventName, userValue, eventInfo) {
    const eventsContainer = document.querySelector('.events');

    const eventTitle = document.createElement('a');
    eventTitle.className = 'event-title';
    eventTitle.href = '#';
    eventTitle.innerHTML = eventName;
    eventTitle.addEventListener('click', (event) => {
        event.preventDefault();
        document.getElementById("main").classList.remove('active');
        document.getElementById("info_" + eventName).classList.add('active');
    });
    eventsContainer.appendChild(eventTitle);


    const options = ['X', 'X?', '?', 'O?', 'O'];
    options.forEach(option => {
        const radioGroup = document.createElement('div');
        radioGroup.classList.add('radio-group');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `event${eventName}`;
        radio.value = option;
        if (option === userValue) {
            radio.checked = true;
        } else {
            radio.disabled = true;
        }
        radio.addEventListener('change', function() {
            fetch(state.scriptURL + '?par=updateSpreadsheet&email=' + state.email + '&eventName=' + eventName + '&option=' + option)
            .then(response => response.json())
            .then(data => {
                updateScore(state.email, data);
            })
            .catch(error => console.error('Error:', error));

            var index = state.data.events.indexOf(eventName.replaceAll("<br>", "\n"));
            state.data.userData[index] = option;
            localStorage.setItem("dataAanwezighedenSteenbrugge", JSON.stringify(state.data));
        });
        radioGroup.appendChild(radio);
        eventsContainer.appendChild(radioGroup);
    });


    const event = document.createElement("div");
    event.className = "container";
    event.id = "info_" + eventName;

    const homeButton = document.createElement("button");
    homeButton.className = "homeButton";
    homeButton.textContent = "HOME";
    homeButton.addEventListener('click', function() {
        document.getElementById("main").classList.add('active');
        document.getElementById("info_" + eventName).classList.remove('active');
    })

    const nextButton = document.createElement("button");
    nextButton.className = "nextButton";
    nextButton.textContent = ">";
    nextButton.id = "nextButton_" + eventName;
    nextButton.addEventListener('click', function() { moveToNextPage("right"); });

    const previousButton = document.createElement("button");
    previousButton.className = "previousButton";
    previousButton.textContent = "<";
    previousButton.id = "previousButton_" + eventName;
    previousButton.addEventListener('click', function() { moveToNextPage("left"); });

    const header = document.createElement("div");
    header.className = "header";

    const title = document.createElement("h1");
    title.innerHTML = eventName;

    const information = document.createElement("span");
    information.className = "infoEvent";
    information.innerHTML = eventInfo;

    header.appendChild(title);
    header.appendChild(document.createElement("br"));
    header.appendChild(document.createElement("br"));

    event.appendChild(homeButton);
    if(state.data != null) {
        if(state.data.events != null){
        if(state.data.events.indexOf(eventName.replaceAll("<br>", "\n")) != state.data.events.length-1){
            event.appendChild(nextButton);
        }
        }
    }
    event.appendChild(previousButton);
    event.appendChild(header);
    event.appendChild(information);

    document.body.appendChild(event);
}

function moveToNextPage(direction){        
    const containers = document.getElementsByClassName("container");
    var current;
    var next;

    for(let i=0;i<containers.length; i++){
        if(containers[i].classList.contains('active')){
            current = containers[i];

            if(direction == "left") {
                next = containers[i-1];
            } else if(direction == "right") {
                next = containers[i+1];
            }
        }
    }

    if(next != undefined && current != undefined) {
        current.classList.remove('active');
        next.classList.add('active');
    }
}

function updateScore(email, data) {
    document.getElementById("score").innerHTML = "Aanwezig: " + data.score + "/" + data.total;  
    document.getElementById("score").style.color = data.background;
}

function updateEvents(data) {
    var events = document.getElementsByClassName("event-title");
    var length = events.length;
    for(let i=1; i < length; i++){
        events[1].remove();
    }
    events = document.getElementsByClassName("radio-group");
    length = events.length;
    for(let i=0; i < length; i++){
        events[0].remove();
    }

    var containers = document.getElementsByClassName("container");
    var currentlyWatching;
    length = containers.length;
    for(let i=1; i < length; i++){
        if(containers[1].classList.contains('active')){
            currentlyWatching = containers[1].id;
        }
        containers[1].remove();
    }

    for (let i = 0; i < data.events.length; i++) {
        if(!data.disabledEvents[i] || document.getElementById("toonAllesInput").checked) {
            createEvent(data.events[i].replaceAll("\n","<br>"), data.userData[i], data.info[i].replaceAll("\n", "<br>"));
        }

        if(currentlyWatching != undefined){
            if("info_" + data.events[i].replaceAll("\n","<br>") == currentlyWatching){
                document.getElementById(currentlyWatching).classList.add('active');
            }
        } else {
            document.getElementById("main").classList.add('active');
        }
    }
}