import { StatusBar } from 'expo-status-bar';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Canvas,
  Rect,
  LinearGradient,
  Skia,
  Shader,
  vec
} from "@shopify/react-native-skia";
import Animated from 'react-native-reanimated';
import { Dimensions } from 'react-native';
import React, { useState, useEffect } from 'react';

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
  console.log(concDiff)
  return dataPoints[candidateIndex][1] + percentToNext * concDiff
}

function getConcentrationFromDosages(dosages, currentTime) {
  let totalConcentration = 0
  dosages.forEach(dose => {
    ratioTo3mgDose = dose.ammountMg / 3.0
    diffTime = currentTime - dose.time
    diffTimeHours = ((diffTime / 60) / 60) / 1000
    totalConcentration += getPlasmaAtTime(diffTimeHours) * ratioTo3mgDose
  });
  return totalConcentration
}

export default function App() {
  const [currentConcentration, setCurrnetConcentration] = useState(0);
  const [dosages, setDosages] = useState([])

  // useEffect(() => {
  //   AsyncStorage.getItem("dosages").then((dosages) => {
  //     setDosages(dosages)
  //     if(dosages.forEach == undefined){
  //       setDosages([])
  //     }
  //   })
  // }, []);

  useEffect(() => {
    const currentTimeTimer = setInterval(() => {
      setCurrnetConcentration(getConcentrationFromDosages(dosages, (Date.now())))
    }, 10)
    return () => {
      clearInterval(currentTimeTimer);
    }
  }, []);

  onAddDose = () => {
    lastDosages = dosages
    lastDosages.push({ "time": Date.now(), "ammountMg": 0.5 })
    AsyncStorage.setItem("dosages", JSON.stringify(lastDosages)).then(() => {
      setDosages(lastDosages)
    })
    AsyncStorage.getItem("dosages").then((dosages) => console.log(dosages))
  }

  onClearDose = () => {
    AsyncStorage.setItem("dosages", JSON.stringify([])).then(() => {
      setDosages([])
    })
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
      </Canvas>
      <View style={{ position: 'absolute', top: '-40%', left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: "white", fontWeight: "bold", fontSize: 48, textShadowRadius: 20 }}>{currentConcentration.toFixed(2)} ng/dL</Text>
      </View>
      <View style={{ position: 'absolute', top: '30%', left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Button style={styles.buttonStyle} title="+ 0.5 mg Dose" onPress={onAddDose}></Button>
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
    color: '#ffffff',
    backgroundColor: 'transparent',
  },
  buttonStyle: {
    position: "absolute",
    bottom: "10%",
    left: "50%",
    width: "50%",
  }
});
