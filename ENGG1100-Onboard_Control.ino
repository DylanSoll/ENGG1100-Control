#include <AFMotor.h>
#include <Servo.h>
#include <SoftwareSerial.h>
const int RXPin = 1; // connects to RX on HM10, TX1 on arduino
const int TXPin = 0; // connects to TX on HM10, RX0 on arduino
const int validate_bit = 209;

//BACK LEFT WHITE M2
//BACK RIGHT BLUE M1
//FRONT RIGHT YELLOW M3
//FRONT LEFT GREEN M4
const int FL_MOTOR_ID = 4;
const int FR_MOTOR_ID = 3;
const int BL_MOTOR_ID = 2;
const int BR_MOTOR_ID = 1;
const int pump_pin = 2;
const int fl_motor_bin_val = 2;
const int fr_motor_bin_val = 4;
const int bl_motor_bin_val = 8;
const int br_motor_bin_val = 16;


const int max_activation_time = 2000;
const int bytes_needed = 8;

int reverse = 0;
int driveTime = 0;
int pumpTime = 0;
int pumpSpeed = 200;
SoftwareSerial SerialBT(TXPin,RXPin);
class DriveControl{
  private:

    int current_speed = 0;
    int inReverse = 0;
    int rem_time = 0;
    long unsigned int last_update = 0;
    int wheel_drive = 1; // 0 is front wheel, 1 is rear wheel drive, 2 is 4-wheel drive
    int fl_active = 0;
    int fr_active = 0;
    int bl_active = 1;
    int br_active = 1;
  public:
      AF_DCMotor* FLMotor;
      AF_DCMotor* FRMotor;
      AF_DCMotor* BLMotor;
      AF_DCMotor* BRMotor;
      DriveControl(){
          this->FLMotor = new AF_DCMotor(FL_MOTOR_ID);
          this->FRMotor = new AF_DCMotor(FR_MOTOR_ID);
          this->BLMotor = new AF_DCMotor(BL_MOTOR_ID);
          this->BRMotor = new AF_DCMotor(BR_MOTOR_ID);
          this->stopAll();
        };
        void stopAll(){
          this->FLMotor->run(RELEASE);
          this->FRMotor->run(RELEASE);
          this->BLMotor->run(RELEASE);
          this->BRMotor->run(RELEASE);
        };

        void activateMotors(){
          if (this->fl_active){
            this->FLMotor->run(this->inReverse ? BACKWARD: FORWARD);
          }else{
             this->FLMotor->run(RELEASE);
          }
          if (this->fr_active){
            this->FRMotor->run(this->inReverse ? BACKWARD: FORWARD);
          }else{
             this->FRMotor->run(RELEASE);
          }
          if (this->bl_active){
            this->BLMotor->run(this->inReverse ? BACKWARD: FORWARD);
          }else{
             this->BLMotor->run(RELEASE);
          }
          if (this->br_active){
            this->BRMotor->run(this->inReverse ? BACKWARD: FORWARD);
          }else{
             this->BRMotor->run(RELEASE);
          }; 
        };
        void forward(int drive_speed = 0){
          this->inReverse = 0;
          if (drive_speed > 0){
            drive_speed = drive_speed <= 255 ? drive_speed : 255;
            this->current_speed = drive_speed;
            this->FLMotor->setSpeed(this->current_speed);
            this->FRMotor->setSpeed(this->current_speed);
            this->BLMotor->setSpeed(this->current_speed);
            this->BRMotor->setSpeed(this->current_speed);
          };
          activateMotors();         
        };
        void backward(int drive_speed = 0){
          this->inReverse = 1;
          if (drive_speed > 0){
            drive_speed = drive_speed <= 255 ? drive_speed : 255;
            this->current_speed = drive_speed;
            this->FLMotor->setSpeed(this->current_speed);
            this->FRMotor->setSpeed(this->current_speed);
            this->BLMotor->setSpeed(this->current_speed);
            this->BRMotor->setSpeed(this->current_speed);
          };
          activateMotors();
        };
        void force_stop(){
          this->rem_time = 0;
          this->stopAll();
        };
        void add_time(int time_to_add = -1){
          this->rem_time += time_to_add > 0 ? time_to_add : 0;
          if (this->rem_time > 2000){
            this->rem_time = 2000;
          };
        };
        void updateSpeed(int new_speed){
          if (new_speed != current_speed){
            this->current_speed = new_speed;
            this->FLMotor->setSpeed(this->current_speed);
            this->FRMotor->setSpeed(this->current_speed);
            this->BLMotor->setSpeed(this->current_speed);
            this->BRMotor->setSpeed(this->current_speed);
          };
        };
        void updateMotors(int fl, int fr, int bl, int br){
          this->fl_active = fl;
          this->fr_active = fr;
          this->bl_active = bl;
          this->br_active = br;
        }

        void updateDirection(int reverse){
          this->inReverse = reverse;
        }

        void update(){
          this->rem_time -= this->last_update ? (millis() - this->last_update): 0;
          this->rem_time = this->rem_time > 0 ? this->rem_time : 0;
          if (this->rem_time){
            if (this->inReverse){
              this->backward();
            }else{
              this->forward();
            };
          }else{
            this->stopAll();
          };
          this->last_update = millis();
        };
};

class PumpControl{
  private:
    int curr_quantity = 0;
    int rem_time = 0;
    long unsigned int last_update = 0;
    int pump_pin;
  public:
    PumpControl(int pin){
      this->pump_pin = pin;
    };
    void on(int new_quantity = -1){
      if (new_quantity != -1){
        this->curr_quantity = new_quantity;
      };
      analogWrite(this->pump_pin, this->curr_quantity);
    };
    void off(){
      digitalWrite(this->pump_pin, LOW);
    };
    void updateQuantity(int new_quantity){
      this->curr_quantity = new_quantity;
    };
    void add_time(int time_to_add = -1){
      this->rem_time += time_to_add > 0 ? time_to_add : 0;
      if (this->rem_time > 2000){
        this->rem_time = 2000;
      };
    };
    void force_off(){
      this->off();
      this->rem_time = 0;
    };
    void update(){
      this->rem_time -= this->last_update ? (millis() - this->last_update): 0;
      if (this->rem_time > 0){
        if (this->curr_quantity){
          this->on();
        }else{
          this->off();
        }
      }else {
        this->off();
        if (this->rem_time){
          this->rem_time = 0;
        };          
      };
      this->last_update = millis();
    };
};
DriveControl* motorControl;
PumpControl* pump;
class ServoControl{
  private:
    int targetAngle = 90;
    Servo* servo;
  public:
    ServoControl(int servoPin){
      this->servo = new Servo();
      this->servo->attach(servoPin);
    };
    int getAngle(){
      return this->servo->read();
    }
    void newTarget(int newTarget = -1){
      if (newTarget != -1){
        this->targetAngle = newTarget;
      };
    };
    void eStop(){
      this->targetAngle = this->servo->read();
    }
    void update(){
      int curr_angle = this->servo->read();
      int angle_diff = this->targetAngle - curr_angle;
      if (this->targetAngle != curr_angle){
        int dir = angle_diff < 0 ? -1 : 1;
        int angleMod = abs(angle_diff) > 3 ? (dir * 3): (dir * abs(angle_diff));
        this->servo->write(curr_angle + angleMod);
        delay(3);
      };
    };
};
ServoControl* hServo;
ServoControl* vServo;
void setup()
{
    
    // Start up serial connection
    Serial.begin(9600); // baud rate
    Serial.flush();

    SerialBT.begin(9600);

    motorControl = new DriveControl();
    motorControl->updateSpeed(200);
    
    pump = new PumpControl(pump_pin);
    pinMode(pump_pin, OUTPUT);
    
    hServo = new ServoControl(9);
    vServo = new ServoControl(10);
};




void loop()
{
  if (SerialBT.peek() == validate_bit){
    if (SerialBT.available() >= bytes_needed){
      int val_bit = SerialBT.read(); //removes validate bit
    int drive_speed = SerialBT.read();
    int drive_duration = SerialBT.read();
    int drive_dir = SerialBT.read();
    int pump_quantity = SerialBT.read();
    int pump_time = SerialBT.read();
    int new_hangle = SerialBT.read();
    int new_vangle = SerialBT.read();
          //    [validate bit, drive speed, drive duration, direction, pump speed, pump duration, horizontal angle, vertical angle]

    if (drive_speed + drive_duration + drive_dir + pump_quantity + pump_time + new_hangle + new_vangle == 0){
      pump->force_off();
      motorControl->force_stop();
      hServo->eStop();
      vServo->eStop();
    }else{
      if (drive_duration){
        motorControl->updateSpeed(drive_speed);
        if (drive_dir > 1){
          int fl = 0;
          int fr = 0;
          int bl = 0;
          int br = 0;
          if (drive_dir - br_motor_bin_val >= 0){
            br = 1;
            drive_dir -= br_motor_bin_val ;
          };
          if (drive_dir - bl_motor_bin_val >= 0){
            bl = 1;
            drive_dir -= bl_motor_bin_val;
          };
          if (drive_dir - fr_motor_bin_val >= 0){
            fr = 1;
            drive_dir -= fr_motor_bin_val;
          };
          if (drive_dir - fl_motor_bin_val >= 0){
            fl = 1;
            drive_dir -= fl_motor_bin_val;
          };
          motorControl->updateMotors(fl, fr, bl, br);
          
        }else{
          motorControl->updateMotors(0, 0, 1, 1);
        };
        motorControl->updateDirection(drive_dir);
        motorControl->add_time(drive_duration);
      };
      if (pump_time){
        pump->updateQuantity(pump_quantity);
        pump->add_time(pump_time);
      };
      if (0 <= new_hangle <= 180){
        hServo->newTarget(new_hangle);
      };
      if (0 <= new_vangle <= 180){
        vServo->newTarget(new_vangle);
      };
    };
    
  };
  }else{
    SerialBT.read();;
  };
  motorControl->update();
  pump->update();
  vServo->update();
  hServo->update();
  
}
