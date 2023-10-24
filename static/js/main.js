const validateBitValue = 209;
const primaryService = 0xFFE0;
const primaryCharacteristic = 0xFFE1;
const estop = document.getElementById("estop");
const pumpBtn = document.getElementById("pump");
const forwardBtn = document.getElementById("forward");
const reverseBtn = document.getElementById("reverse");
const rebootConnBtn = document.getElementById("clear-connect");
const clearBLEBtn = document.getElementById("clear-ble");
const speedSlider = document.getElementById("drive-speed");
const pumpSlider = document.getElementById("pump-speed");
const hangleSlider = document.getElementById("hangle");
const vangleSlider = document.getElementById("vangle");
const hangleText = document.getElementById("hangle-value");
const vangleText = document.getElementById("vangle-value");
const driveText = document.getElementById("drive-speed-value");
const pumpText = document.getElementById("pump-speed-value");
const connectButton = document.getElementById("connect");
const connectToAnyButton = document.getElementById("conn-to-all");
const disconnectButton = document.getElementById("disconnect");
const turnControl = document.getElementById("allow_turning");
const moreButtons = document.getElementById("more_buttons");
const front_drive_button = document.getElementById("f_drive");
const rear_drive_button = document.getElementById("r_drive");
const four_drive_button = document.getElementById("4_drive");
const fl_wheel_activate = document.getElementById("fl_wheel_activate");
const fr_wheel_activate = document.getElementById("fr_wheel_activate");
const bl_wheel_activate = document.getElementById("bl_wheel_activate");
const br_wheel_activate = document.getElementById("br_wheel_activate");
const advanced_drive_btn = document.getElementById("advanced_settings_btn");
const currConnSpan = document.getElementById("current_connection");
const moreButtonsDiv = document.getElementById("more-buttons-div");
const headingBtns = {
  left2: document.getElementById("left2"),
  left1: document.getElementById("left1"),
  straight: document.getElementById("straight"),
  right1: document.getElementById("right1"),
  right2: document.getElementById("right2"),
  settings: {
    turningAllowed: false,
    shown: false,
    active: document.getElementById("straight")
  }
}
const forwardVal = 0;
const reverseVal = forwardVal ? 0 : 1;
const leftTurnMod = 1;
const rightTurnMod = leftTurnMod === 1 ? -1 : 1

const headingBtnsValMap = {
  left2: leftTurnMod * 2,
  left1: leftTurnMod * 1,
  straight: 0,
  right1: rightTurnMod * 1,
  right2: rightTurnMod * 2
}

const drive_wheel_modes = {
  front: {fl: 1, fr: 1, bl: 0, br: 0},
  rear: {fl: 0, fr: 0, bl: 1, br: 1},
  four: {fl: 1, fr: 1, bl: 1, br: 1},
  left1: {fl: 0, fr: 0, bl: 0, br: 1},
  left2: {fl: 0, fr: 1, bl: 0, br: 1},
  right1: {fl: 0, fr: 0, bl: 1, br: 0},
  right2: {fl: 1, fr: 0, bl: 1, br: 0}
}

const drive_buttons = [front_drive_button, rear_drive_button, four_drive_button, advanced_drive_btn]
class BluetoothHandler{
  constructor(primaryService, primaryCharacteristic, logger = console.log, onChangeHandler = null){
    this.log = logger;
    this.device = null;
    this.deviceName = "N/A"
    this.characteristic = null;
    this.onChange = onChangeHandler;
    this.primaryService = primaryService;
    this.primaryCharacteristic = primaryCharacteristic;
  }
  onChangeHandler(event){
    if (this.onChange != null){
      this.onChange(event)
    }
  }
  connect(filtered = true) {
    return (this.device ? Promise.resolve(this.device) :
        this.requestBluetoothDevice(filtered)).
        then(device => this.connectDeviceAndCacheCharacteristic(device)).
        then(characteristic => this.startNotifications(characteristic)).
        catch(this.log);
  }
  requestBluetoothDevice(filtered = true) {
    this.log('Requesting bluetooth device');
    return navigator.bluetooth.requestDevice(filtered ? {filters: [{services: [primaryService]}]} : {acceptAllDevices: true}).
        then(device => {
          this.device = device;
          this.deviceName = device?.name === undefined ? "N/A" : this.device?.name;
          this.updateConnName(this.deviceName)
          this.device.addEventListener('gattserverdisconnected', this.handleDisconnection);
          return this.device;
        });
  }
  handleDisconnection(event) {
    let device = event.target;
    console.log(`"${device.name}" disconnected -- trying to reconnect`);
    this.updateConnName()
    this.connectDeviceAndCacheCharacteristic(device).
        then(this.startNotifications).
        catch(console.warn);
  }
  
  connectDeviceAndCacheCharacteristic(device) {
    if (device.gatt.connected && this.characteristic) {
      return Promise.resolve(this.characteristic);
    }
  
    this.log(`Connecting to GATT for "${device?.name == undefined ? "N/A" : device?.name}"`);
  
    return device.gatt.connect().
        then(server => {
          this.log('Connected, getting service');
          return server.getPrimaryService(this.primaryService);
        }).
        then(service => {
          this.log('Found service, getting characteristic');
  
          return service.getCharacteristic(this.primaryCharacteristic);
        }).
        then(characteristic => {
          this.log('Found characteristic');
          this.characteristic = characteristic;
          return this.characteristic;
        });
  };
  
  startNotifications(characteristic) {
    this.log('Starting notifications...');
  
    return characteristic.startNotifications().
        then(() => {
          this.log('Notifications started');
          characteristic.addEventListener('characteristicvaluechanged',
              this.onChangeHandler);
        });
  };
  writeWithResponse(bufferArray, responseHandler, errorHandler){
    this.characteristic.writeValueWithResponse(bufferArray).then(responseHandler).catch(errorHandler);
  }
  disconnect() {
    if (this.device) {
      log('Disconnecting from "' + this.deviceName + '" bluetooth device...');
      this.device.removeEventListener('gattserverdisconnected',
          this.handleDisconnection);
  
      if (this.device.gatt.connected) {
        this.device.gatt.disconnect();
        log('"' + this.device.name + '" bluetooth device disconnected');
      }
      else {
        log('"' + this.device.name +
            '" bluetooth device is already disconnected');
      }
    }
  
    if (this.characteristic) {
      this.characteristic.removeEventListener('characteristicvaluechanged',
          this.onChangeHandler);
          this.characteristic = null;
    }
  
    this.device = null;
  }
  clear(){
    this.characteristic = null;
    this.device = null;
    this.deviceName = null;
    this.disconnect();
  }
  clearAndConnect(filtered = true) {
    this.clear();
    this.connect(filtered)
  }
  updateConnName(new_name = null){
    if (new_name === null){
      new_name = "N/A"
    }
    currConnSpan.innerText = new_name === null ? "N/A" : new_name;
  }
}

class DataHandler{
  #validateBit = 209
  constructor(validate_bit = 209, driveSpeed = 200, pumpSpeed = 200, verAngle = 90, horAngle = 90){
    this.#validateBit = validate_bit;
    this.unsentData = false;
    this.sendingData = false;
    this.drive_pressed = null;
    this.bluetooth = new BluetoothHandler(primaryService, primaryCharacteristic)
    this.estop = {
      end: false,
      force: false
    }
    this.drive = {
      active: false,
      direction: null,
      speed: driveSpeed,
      timing: {
        duration: 0,
        lastUpdate: null
      },
      turning: {
        heading: 0,
        allowed: false
      },
      active_wheels: {
        fl: 0,
        fr: 0,
        bl: 1,
        br: 1
      }
    }
    this.pump = {
      active: false,
      quantity: pumpSpeed,
      timing: {
        duration: 0,
        lastUpdate: null
      },
    }
    this.angles = {
      changed: false,
      vertical: verAngle,
      horizontal: horAngle,
    }
  }
  trySend(){
    if (this.sendingData){
      this.unsentData = true;
    }else{
      this.sendPayload();
    };
  }
  forceEstop(){
    this.estop.end = false;
    this.estop.force = true;
    this.pump.active = false;
    this.drive.active = false;
    this.trySend();
  }
  stopEstop(){
    this.estop.end = true;
    this.trySend();
  }
  startDrive(reverse = 0){
    if (this.drive_pressed === null){
      this.drive.active = true;
      this.drive_pressed = reverse;
      this.drive.direction = reverse;
      this.drive.timing.lastUpdate = Date.now()
    }
    this.trySend();
  }
  endDrive(reverse = 0){
    this.drive.active = false;
    this.drive.timing.duration = 0;
      this.drive.timing.lastUpdate = null;
      this.drive_pressed = null;
    if (this.drive_pressed === reverse){
      
      this.drive.active = false;
      //this.stopDriveTimer();
      
    }
    this.trySend();
  }
  newWheelMode(newDriveMode){
    this.drive.active_wheels = newDriveMode;
  }
  startPump(){
    if (!this.pump.active){
      this.pump.active = true;
      this.pump.timing.lastUpdate = Date.now()
    }
    this.trySend();
  }
  endPump(){
    if (this.pump.active){
      this.pump.active = false;
      this.stopPumpTimer();
    }
    this.trySend();
  }
  getModDriveDirection(){
    var wheel_config_arr = [this.drive.direction, this.drive.active_wheels.fr, this.drive.active_wheels.fl, this.drive.active_wheels.bl, this.drive.active_wheels.br];
    if (this.drive.turning.allowed && this.drive.turning.heading){
      const targetHeading = this.drive.turning.heading;
      const turningMode = drive_wheel_modes[targetHeading > 0 ? (targetHeading === 1 ? "right1" : "right2") : (targetHeading === -1 ? "left1" : "left2")];
      wheel_config_arr = [this.drive.direction, turningMode.fr, turningMode.fl, turningMode.bl, turningMode.br];
    }
    return wheel_config_arr.reduce((accum, curr, index) => {
      return accum + curr * (2 ** (index))
    }, 0);
  }
  getData(clearTimer = false){
    var outdata = []
    // payload is [validate bit, drive speed, drive duration, direction, pump speed, pump duration, horizontal angle, vertical angle]
    if (this.estop.force){
      outdata = new Uint8Array([this.#validateBit, 0, 0, 0, 0, 0, 0, 0]);
      this.pump.timing.lastUpdate = null;
      this.drive.timing.lastUpdate = null;
    }else{
      var out_dir = this.getModDriveDirection();
      var pump_duration = this.pump.timing.duration;
      var drive_duration = this.drive.timing.duration;

      if (this.drive.timing.lastUpdate != null){
        var updateTime = Date.now();
        drive_duration += -20 + updateTime > this.drive.timing.lastUpdate ? updateTime - this.drive.timing.lastUpdate : 0;
        this.drive.timing.lastUpdate = clearTimer ? null : updateTime;
      }
      if (this.pump.timing.lastUpdate != null){
        var updateTime = Date.now();
        pump_duration += -20 + updateTime > this.pump.timing.lastUpdate ? updateTime - this.pump.timing.lastUpdate : 0;
        this.pump.timing.lastUpdate = clearTimer ? null : updateTime;
      }
      pump_duration = pump_duration > 255 ? 255 : (pump_duration < 0 ? 0 : pump_duration);
      drive_duration = drive_duration > 255 ? 255 : (drive_duration < 0 ? 0 : drive_duration);
      outdata = new Uint8Array([this.#validateBit, this.drive.speed, drive_duration, out_dir, 
        this.pump.quantity, pump_duration, this.angles.horizontal, this.angles.vertical]);
    }
    this.pump.timing.duration = 0;
    this.drive.timing.duration = 0;
    return outdata;
  }
  

  newDriveSpeed(new_speed = 0){
    if (1 <= new_speed && new_speed <= 255){
      this.drive.speed = new_speed;
    };
  }
  newPumpQuantity(new_quantity = 0){
    if (1 <= new_quantity && new_quantity <= 255){
      this.pump.quantity = new_quantity;
    };
  }
  
  stopDriveTimer(){
    if (this.drive.timing.lastUpdate !== null){
      var diff = Date.now() - this.drive.timing.lastUpdate;
      this.drive.timing.duration += (diff > 0 ? diff: 0);
      this.pump.timing.lastUpdate = null;
    };
  }
  stopPumpTimer(){
    if (this.pump.timing.lastUpdate !== null){
      var diff = Date.now() - this.pump.timing.lastUpdate;
      this.pump.timing.duration += (diff > 0 ? diff: 0);
      this.pump.timing.lastUpdate = null;
    };
  }
  newHorizontalAngle(new_angle){
    if (0 <= new_angle && new_angle <= 180){
      if (this.angles.horizontal != new_angle){
        this.angles.horizontal = new_angle;
        this.angles.changed = true;
      };
    };
    this.trySend();
  } 
  newVerticalAngle(new_angle){
    if (0 <= new_angle && new_angle <= 180){
      if (this.angles.vertical != new_angle){
        this.angles.vertical = new_angle;
        this.angles.changed = true;
      };
    };
    this.trySend();
  }
  incrementHorizontalAngle(increment = 1, direction = 1){
    new_angle = this.angles.horizontal + increment * direction;
    new_angle = new_angle < 0 ? 0: new_angle > 180 ? 180 : new_angle;
    if (new_angle != this.angles.horizontal){
      this.angles.changed = true;
      this.angles.horizontal = new_angle;
    }
    this.trySend();
  };
  incrementVerticalAngle(increment = 1, direction = 1){
    new_angle = this.angles.vertical + increment * direction;
    new_angle = new_angle < 0 ? 0: new_angle > 180 ? 180 : new_angle;
    if (new_angle != this.angles.vertical){
      this.angles.changed = true;
      this.angles.vertical = new_angle;
    }
    this.trySend();
  };
  sendPayload(){
    if (this.sendingData){
      this.unsentData = true;
    }else{
      this.sendingData = true;
      this.unsentData = false;
      this.angles.changed = false;
      const data = this.getData();
      this.drive.timing.duration = 0;
      this.pump.timing.duration = 0;
      console.log(data)
      this.bluetooth.writeWithResponse(data, ()=>{this.sendSuccess()}, this.sendFail);
    };
  };
  sendSuccess(e = null){
    this.sendingData = false;
    if (this.estop.end){
      this.estop.end = false;
      this.estop.force = false;
    }
    if (this.unsentData || this.drive.active || this.pump.active || this.angles.changed){
      this.sendPayload();
    }
  }
  sendFail(e = null){
    console.log(e);
    console.log(e.message == "GATT operation in progress")
    this.sendingData = true;
    if (e.message == "GATT operation in progress"){
      this.sendingData = true;
    }
  }
  clearBLE(){
    const primService = this.bluetooth.primaryService;
    const primChar = this.bluetooth.primaryCharacteristic;
    this.bluetooth.clear();
    this.sendingData = false;
    this.unsentData = false;
    this.stopPumpTimer();
    this.stopDriveTimer();
    this.drive.timing.duration = 0;
    this.pump.timing.duration = 0;
    this.drive.active = false;
    this.pump.active = false;
    this.angles.changed = false;
    this.drive_pressed = null;
    this.bluetooth = new BluetoothHandler(primService, primChar);
  }
  clearAndReconn(filtered = true){
    this.clearBLE();
    this.bluetooth.connect(filtered);
  }
}
var dataController = new DataHandler();

function clearBLE(){
  dataController.bluetooth.clear();
  dataController.bluetooth = new BluetoothHandler(primaryService, primaryCharacteristic);
}
connectButton.addEventListener("mouseup", e=> {
  dataController.bluetooth.connect()
});
connectButton.addEventListener("touchend", e=> {
  dataController.bluetooth.connect()
});
connectToAnyButton.addEventListener("mouseup", e=> {
  dataController.bluetooth.connect(false)
});
connectToAnyButton.addEventListener("touchend", e=> {
  dataController.bluetooth.connect(false)
});
disconnectButton.addEventListener("mouseup", e=> {
  dataController.bluetooth.disconnect();
});
disconnectButton.addEventListener("touchend", e=> {
  dataController.bluetooth.disconnect();
});
clearBLEBtn.addEventListener("mouseup", e=> {
  dataController = new DataHandler();
  dataController.clearBLE();
});
clearBLEBtn.addEventListener("touchend", e=> {
  dataController = new DataHandler();
  dataController.clearBLE();
});
rebootConnBtn.addEventListener("mouseup", e=> {
  speedSlider.setAttribute("value", "200");
  pumpSlider.setAttribute("value", "200");
  hangleSlider.setAttribute("value", "90");
  vangleSlider.setAttribute("value", "90");
  dataController = new DataHandler();
  dataController.clearAndReconn(true);
});
rebootConnBtn.addEventListener("touchend", e=> {
  speedSlider.setAttribute("value", "200");
  pumpSlider.setAttribute("value", "200");
  hangleSlider.setAttribute("value", "90");
  vangleSlider.setAttribute("value", "90");
  dataController = new DataHandler();
  dataController.clearAndReconn(true);
});

speedSlider.addEventListener("input", (e)=>{
  var driveSpeed = parseInt(e?.target?.value);
  driveSpeed = driveSpeed < 0 ? 0 : (driveSpeed > 255 ? 255: driveSpeed) 
  dataController.newDriveSpeed(driveSpeed);
  driveText.innerText = driveSpeed;
});
pumpSlider.addEventListener("input", (e)=>{
  var pumpQuantity = parseInt(e?.target?.value);
  pumpQuantity = pumpQuantity < 0 ? 0 : (pumpQuantity > 255 ? 255: pumpQuantity);
  pumpText.innerText = pumpQuantity;
  dataController.newPumpQuantity(pumpQuantity);
});


hangleSlider.addEventListener("input", (e)=>{
  var newHangle = parseInt(e?.target?.value);
  newHangle = newHangle < 0 ? 0 : (newHangle > 255 ? 255: newHangle);
  hangleText.innerText = newHangle;
  dataController.newHorizontalAngle(newHangle);
});
vangleSlider.addEventListener("input", (e)=>{
  newVangle = parseInt(e?.target?.value);
  vangleText.innerText = newVangle;
  dataController.newVerticalAngle(newVangle);
});

estop.addEventListener("mousedown", e => {
  dataController.forceEstop();
});
estop.addEventListener("mouseup", e => {
  dataController.stopEstop();
});
estop.addEventListener("touchstart", e => {
  dataController.forceEstop();
}, {passive: true});
estop.addEventListener("touchend", e => {
  dataController.stopEstop();
});

forwardBtn.addEventListener("mousedown", e => {dataController.startDrive(forwardVal);});
forwardBtn.addEventListener("mouseup", e => {dataController.endDrive(forwardVal);});
forwardBtn.addEventListener("touchstart", e => {dataController.startDrive(forwardVal);}, {passive: true});
forwardBtn.addEventListener("touchend", e => {dataController.endDrive(forwardVal);});

reverseBtn.addEventListener("mousedown", e => {dataController.startDrive(reverseVal);});
reverseBtn.addEventListener("mouseup", e => {dataController.endDrive(reverseVal);});
reverseBtn.addEventListener("touchstart", e => {dataController.startDrive(reverseVal);}, {passive: true});
reverseBtn.addEventListener("touchend", e => {dataController.endDrive(reverseVal);});



pumpBtn.addEventListener("mousedown", e=> {dataController.startPump()});
pumpBtn.addEventListener("mouseup", e=> {dataController.endPump()});
pumpBtn.addEventListener("touchstart", e=> {dataController.startPump()}, {passive: true});
pumpBtn.addEventListener("touchend",  e=> {dataController.endPump()});

function activate_drive_mode(btn_id){
  drive_buttons.forEach(btn => {
    if (btn.id === btn_id){
      btn.style.border = "2px solid white";
      btn.className = "btn btn-success";
    }else if (btn.id == advanced_drive_btn.id){
      btn.style.border = "";
      btn.className = "btn btn-info";
    }else{
      btn.style.border = "";
      btn.className = "btn btn-secondary";
    }
  });
}

front_drive_button.addEventListener("click", (e)=>{
  activate_drive_mode(front_drive_button.id);
  dataController.newWheelMode(drive_wheel_modes.front);
  fl_wheel_activate.setAttribute("checked", "");
  fr_wheel_activate.setAttribute("checked", "");
  bl_wheel_activate.removeAttribute("checked");
  br_wheel_activate.removeAttribute("checked");
});
rear_drive_button.addEventListener("click", (e)=>{
  activate_drive_mode(rear_drive_button.id);
  dataController.newWheelMode(drive_wheel_modes.rear);
  fl_wheel_activate.removeAttribute("checked");
  fr_wheel_activate.removeAttribute("checked");
  bl_wheel_activate.setAttribute("checked", "");
  br_wheel_activate.setAttribute("checked", "");
});
four_drive_button.addEventListener("click", (e)=>{
  activate_drive_mode(four_drive_button.id);
  dataController.newWheelMode(drive_wheel_modes.four);
  fl_wheel_activate.setAttribute("checked", "");
  fr_wheel_activate.setAttribute("checked", "");
  bl_wheel_activate.setAttribute("checked", "");
  br_wheel_activate.setAttribute("checked", "");
});
function handle_custom_wheel_activation(target){
  dataController.drive.active_wheels[target] = -1 * (dataController.drive.active_wheels[target] - 1);
  console.log(dataController.drive.active_wheels);
  num_active = Object.values(dataController.drive.active_wheels).reduce((accum, curr)=>accum+curr, 0);
  if (num_active === 4){
    activate_drive_mode(four_drive_button.id);
  }else if (num_active === 2){
    if (dataController.drive.active_wheels.fl && dataController.drive.active_wheels.fr){
      activate_drive_mode(four_drive_button.id);
    }else if (dataController.drive.active_wheels.bl && dataController.drive.active_wheels.br){
      activate_drive_mode(rear_drive_button.id);
    }else{
      activate_drive_mode(advanced_drive_btn.id);
    }
  }else{
    activate_drive_mode(advanced_drive_btn.id);
  }
};
fl_wheel_activate.addEventListener("input", (e)=>{
  handle_custom_wheel_activation("fl");
});
fr_wheel_activate.addEventListener("input", (e)=>{
  handle_custom_wheel_activation("fr");
});
bl_wheel_activate.addEventListener("input", (e)=>{
  handle_custom_wheel_activation("bl");
});
br_wheel_activate.addEventListener("input", (e)=>{
  handle_custom_wheel_activation("br");
});
function handleSelected(newSelected = null){
  if (newSelected !== null){
    headingBtns.settings.active = newSelected;
  }
  Object.entries(headingBtns).forEach(entry=>{
    if (entry[1].id == headingBtns.settings.active.id){
      entry[1].style ="border: 2px solid white;";
      dataController.drive.turning.heading = headingBtnsValMap[entry[0]];
    }else{
      entry[1].style ="border: 1px solid transparent;";
    }
  });  
}
function handleEnableTurning(){
  headingBtns.settings.active = headingBtns.straight;
  if (headingBtns.settings.shown){
    if (headingBtns.settings.turningAllowed){
      Object.entries(headingBtns).forEach(entry=>{
        if (entry[0] != "settings"){
          entry[1].removeAttribute("disabled");
          entry[1].removeAttribute("hidden");
        }
      });
    }else{
      Object.entries(headingBtns).forEach(entry=>{
        if (entry[0] != "settings"){
          entry[1].setAttribute("disabled", true);
          entry[1].removeAttribute("hidden");
        }
      });
    }
    
  }else{
    Object.entries(headingBtns).forEach(entry=>{
      if (entry[0] != "settings"){
        entry[1].setAttribute("disabled", true);
        entry[1].setAttribute("hidden", true);
      }
    });
  };
  handleSelected()
}
Object.entries(headingBtns).forEach(entry => {
  if (entry[0] != "settings"){
    entry[1].addEventListener("mouseup", (e)=>{
      handleSelected(entry[1]);
    });
    entry[1].addEventListener("touchend", (e)=>{
      handleSelected(entry[1]);
    });
  }
});
turnControl.addEventListener("input", e=>{
  if (turnControl.hasAttribute("checked")){
    turnControl.removeAttribute("checked");
    dataController.drive.turning.allowed = false;
    headingBtns.settings.turningAllowed = false;
    handleEnableTurning()
  }else{
    turnControl.setAttribute("checked", "");
    dataController.drive.turning.allowed = true;
    headingBtns.settings.turningAllowed = true;
    handleEnableTurning()
  };
});
moreButtons.addEventListener("input", e=>{
  if (moreButtonsDiv.hasAttribute("hidden")){
    moreButtons.setAttribute("checked", "");
    headingBtns.settings.shown = true;
    handleEnableTurning();
  }else{
    moreButtons.removeAttribute("checked");
    headingBtns.settings.shown = false;
    moreButtonsDiv.setAttribute("hidden", true)
    handleEnableTurning();
  }
});

function updateAngleSlider(horizontal, newAngle){
  if (0 <= newAngle && newAngle <= 180){
    if (horizontal){
        hangleText.innerText = newAngle;
        hangleSlider.setAttribute("value", newAngle);
    }else{
        vangleText.innerText = newAngle;
        vangleSlider.setAttribute("value", newAngle);
    }
}  
}
function updateAngle(horizontal, newAngle){
  if (0 <= newAngle && newAngle <= 180){
      updateAngleSlider(horizontal, newAngle);
      if (horizontal){
        dataController.newHorizontalAngle(newAngle)
      }else{
        dataController.newVerticalAngle(newAngle)
      }
  }  
}
function incrementUpdateAngle(horizontal, direction, increment){ 
  if (horizontal){
      var newHangle = dataController.angles.horizontal + direction * increment;
      if (0 <= newHangle && newHangle <= 180){
          updateAngle(horizontal, newHangle);
      }
  }else{
      var newVangle = dataController.angles.vertical + direction * increment;
      if (0 <= newVangle && newVangle <= 180){
        updateAngle(horizontal, newVangle);
      }
  }
}

class keyHandler{
  constructor(){
    this.headingPressed = 0;
    this.isPumping = false;
    this.driveDir = null;
    this.timeouts = {
      hangle: null,
      vangle: null
    }
    this.angleUpdates = {
      hangle: null,
      vangle: null
    };
    this.incrementModifier = 1
  }
  incrementAngle(horizontal, direction){
    incrementUpdateAngle(horizontal, direction, 1);
  }
  stopIncrement(horizontal, ctrlPressed = false){
    if (ctrlPressed){
        console.log("implement ctrl press");
    }
  }
  durationToAngleIncrement(duration){
    duration = duration < 0 ? 0 : duration > 1000 ? 1000 : duration;
    return ((duration / 1000) * 180) * this.incrementModifier;
  }
  clearHangleTimeout(){
    if (this.timeouts.hangle){
      clearTimeout(this.timeouts.hangle);
    }
  }
  clearVangleTimeout(){
    if (this.timeouts.vangle){
      clearTimeout(this.timeouts.vangle);
    }
  }
  keyDownEvent(e){
    const key = e.key;
    const upper = key.toUpperCase();
    switch (upper){
      case "W":
        dataController.startDrive(forwardVal);
        break
      case "S":
        dataController.startDrive(reverseVal);
        break
      case "A":
        dataController.drive.turning.heading = leftTurnMod * (e.altKey ? 1 : 2);
        break
      case "D":
        dataController.drive.turning.heading = rightTurnMod * (e.altKey ? 1 : 2);
        break
      case " ":
        dataController.startPump();
        break
      case "ARROWLEFT":
          this.incrementAngle(1, -1);
        break
      case "ARROWRIGHT":
          this.incrementAngle(1, 1);
        break
      case "ARROWUP":
          this.incrementAngle(0, 1);
        break
      case "ARROWDOWN":
          this.incrementAngle(0, -1);
        break
      case "ENTER":
        dataController.forceEstop();
        break
    }
  }
  keyUpEvent(e){
    const key = e.key;
    const upper = key.toUpperCase();
    switch (upper){
      case "W":
        dataController.endDrive(forwardVal);
        break
      case "S":
        dataController.endDrive(reverseVal);
        break
      case "A":
        dataController.drive.turning.heading = 0;
        break
      case "D":
        dataController.drive.turning.heading = 0;
        break
      case " ":
        dataController.endPump();
        break
      case "ENTER":
          dataController.stopEstop();
          break
    }
  }
}
keyControl = new keyHandler()

document.body.addEventListener("keydown", e => {keyControl.keyDownEvent(e)})
document.body.addEventListener("keyup", e => {keyControl.keyUpEvent(e)})