import { StatusBar } from 'expo-status-bar';
import { Button, ScrollView, StyleSheet, Text, TouchableHighlight, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Canvas,
  Rect,
  LinearGradient,
  Skia,
  Shader,
  Circle,
  vec
} from "@shopify/react-native-skia";
import {useSharedValue, withDecay} from 'react-native-reanimated';
import { Dimensions, Animated } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';

dotsSoFar = 0

REAL_TIME = false

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height * 1.2;

function getPlasmaAtTime(time) {
  timeHours = time
  //For 3mg dosage at t = 0, reported in hours and ng/mL
  dataPoints = [[0, 0],
  [1, 1.5],
  [2, 9],
  [2.5, 11],
  [3, 12.5],
  [4, 16.5],
  [5, 19],
  [6, 22],
  [8, 23],
  [12, 24],
  [16, 20],
  [24, 14.5],
  [30, 12],
  [36, 10],
  [48, 3]]

  timePeriodFound = false
  candidateIndex = -1
  while (!timePeriodFound) {
    if (candidateIndex >= dataPoints.length - 2) {
      return 0
    }
    candidateIndex++
    if (timeHours >= dataPoints[candidateIndex][0] && timeHours < dataPoints[candidateIndex + 1][0]) {
      timePeriodFound = true
    }
  }
  durationInQuestion = dataPoints[candidateIndex + 1][0] - dataPoints[candidateIndex][0]
  percentToNext = (timeHours - dataPoints[candidateIndex][0]) / durationInQuestion
  concDiff = dataPoints[candidateIndex + 1][1] - dataPoints[candidateIndex][1]
  return dataPoints[candidateIndex][1] + percentToNext * concDiff
}

function getConcentrationFromDosages(dosagesRef, currentTime) {
  let totalConcentration = 0
  dosages = dosagesRef.current
  dosages.forEach(dose => {
    ratioTo3mgDose = dose.ammountMg / 3.0
    diffTime = currentTime - dose.time
    if(REAL_TIME){
      diffTimeHours = ((diffTime / 60) / 60) / 1000
    }else{
      diffTimeHours = ((diffTime / 60) / 10)
    }
    totalConcentration += getPlasmaAtTime(diffTimeHours) * ratioTo3mgDose
  });
  return totalConcentration
}

function getUpdatedDots(previousAnimtedDots, currentConcentrationRef){
  currentConcentration = currentConcentrationRef.current
  while(previousAnimtedDots.length < 2 * currentConcentration){
    dotsSoFar++
    previousAnimtedDots.push({x: Math.random() * windowWidth, y: (-1 + Math.random()) * windowHeight, vx: 0, vy: 0, num: dotsSoFar + 1, r : currentConcentration * 3 + (currentConcentration / 3) * Math.random()})
  }
  previousAnimtedDots.forEach((dot) => {
    dot.y += dot.r * 2/30
    dot.x += dot.vx
    dot.y += dot.vy
    // previousAnimtedDots.forEach((otherDot) => {
    //   distSq = (dot.x - otherDot.x)**2 + (dot.y - otherDot.y)**2
    //   if(distSq < 2){
    //     distSq = 2
    //   }
    //   force[0] += (0.01/distSq) * (dot.x - otherDot.x)
    //   force[1] += (0.01/distSq) * (dot.y - otherDot.y)
    // })
    //dot.vx = dot.vx / 1.1
    //dot.vy = dot.vy / 1.1
  })
  previousAnimtedDots.forEach((dot) => {
    if(dot.y > windowHeight){
      previousAnimtedDots.splice(previousAnimtedDots.indexOf(dot), 1)
    }
  })
  return previousAnimtedDots
}

export default function App() {
  const [currentConcentration, setCurrnetConcentration] = useState(0);
  const [dosages, setDosages] = useState([])
  const [animatedDots, setAnimatedDots] = useState([])
  const [animatedDotsJSX, setAnimatedDotsJSX] = useState([])
  const concentrationRef = useRef(currentConcentration)
  const dosageRef = useRef(dosages)
  dosageRef.current = dosages
  concentrationRef.current = currentConcentration

  useEffect(() => {
    AsyncStorage.getItem("dosages").then((retrievedDosages) => {
      setDosages(JSON.parse(retrievedDosages))
    })
  }, [])

  useEffect(() => {
    concentrationRef.current = currentConcentration
  }, [currentConcentration])

  useEffect(() => {
    const animationTimer = setInterval(() => {
      setAnimatedDots(getUpdatedDots(animatedDots, concentrationRef))
      dotsJSX = []
      animatedDots.forEach((dot) => {
          r = 10
          dotsJSX.push(
          <Circle cx={dot.x} cy={dot.y} r={dot.r} key={dot.num}>
            <LinearGradient
              start={vec(dot.x, dot.y)}
              end={vec(dot.x + 2 * r, dot.y + 2 * dot.r)}
              colors={["#00ff87", "#60efff"]}
            />
          </Circle>)
      })
      setAnimatedDotsJSX(dotsJSX)
    }, 32)
    return () => {
      clearInterval(animationTimer);
    }
  }, []);


  useEffect(() => {
    const currentTimeTimer = setInterval(() => {
      setCurrnetConcentration(getConcentrationFromDosages(dosageRef, (Date.now())))
    }, 50)
    return () => {
      clearInterval(currentTimeTimer);
    }
  }, []);

  onAddDose = () => {
    lastDosages = dosages
    lastDosages.push({ "time": Date.now(), "ammountMg": 0.5 })
    console.log(lastDosages)
    AsyncStorage.setItem("dosages", JSON.stringify(lastDosages)).then(() => {
      setDosages(lastDosages)
    })
  }

  onClearDose = () => {
    AsyncStorage.setItem("dosages", JSON.stringify([])).then(() => {
      setDosages([])
      console.log("Dosages Cleared!")
    }).catch((reason) => {console.log("Could not clear dosage storage because : " + reason)})
  }

  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1 }}>
        <Rect x={0} y={0} width={windowWidth} height={windowHeight}>
          <LinearGradient
            start={vec(0, -windowHeight * 0.2)}
            end={vec(0, windowHeight * 1.1)}
            colors={["green", "white"]}
          />
        </Rect>
        {animatedDotsJSX}
      </Canvas>
      <Animated.View style={{ position: 'absolute', top: '-40%', left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 48, textShadowRadius: 20 }}>{currentConcentration.toFixed(2)} ng/dL</Text>
      </Animated.View>
      <View style={{ position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center'}}>
        <TouchableHighlight style={styles.buttonStyle} onPressOut={onAddDose}>
          <Text style={styles.buttonText}>+ 0.5 mg Dose</Text>
        </TouchableHighlight>
        <View style={{paddingTop: '10%', width: '10px'}}></View>
        <TouchableHighlight style={styles.buttonStyle} onPressOut={onClearDose}>
          <Text style={styles.buttonText}>Clear Dosing</Text>
        </TouchableHighlight>
        <View>
        </View>
      </View>
    </View >
  );
}

var styles = StyleSheet.create({
  dosageAmount: {
    position: "absolute",
    color: "white",
    textShadowRadius: 50,
    paddingLeft: '50%',
    paddingTop: '10%',
    fontWeight: 'bold',
  },
  linearGradient: {
    flex: 1,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 5
  },
  buttonText: {
    fontSize: 18,
    textAlign: 'center',
    margin: 10,
    color: '#BBBBBB',
    backgroundColor: 'transparent',
  },
  buttonStyle: {
    margin: '50px',
    padding: '50px',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowRadius: 10
  }
});
