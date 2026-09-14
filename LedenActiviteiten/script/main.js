import "./auth.js";
import "./handlers.js";
import { loggedIn } from "./loggedIn.js";
import { updateEvents } from "./events.js";
import { state } from "./state.js";

var url;

if(state.email != null){
    loggedIn();
}

var data = JSON.parse(localStorage.getItem("dataAanwezighedenSteenbrugge"));
if(data != null && data != "null"){
    state.data = data;
    updateEvents(state.data);
}

url = state.scriptURL;
document.getElementById("logOutButton").style.display = "inline";

let URLevent = decodeURIComponent(window.location.href.split("event=")[1]);
const containers = document.getElementsByClassName("container");
for(let i=0;i<containers.length; i++){
    let containerID = containers[i].id.split("info_")[1];
    if(containerID != undefined) {
        containerID = containerID.replaceAll("<br>", " ");
        if(containerID == URLevent){
            containers[i].classList.add('active');
            containers[0].classList.remove('active');
            break;
        }
    }
}