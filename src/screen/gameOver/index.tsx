import React, { useEffect } from "react";
import { Dimensions, Image, View } from "react-native";
import { R } from "../../assets";
import { navigate } from "../../navigation/navigate";
const {width,height}=Dimensions.get('screen');
export default function GameOver(){
    useEffect(() => {
        const goBack = setTimeout(() => {
          navigate('Dashboard');
        }, 500);
        return () => clearTimeout(goBack);
      }, []);
      
    return(
        <View style={{flex:1,backgroundColor:'red'}}>
            <Image source={R.images.game_over} style={{flex:1,width:width,height:height}} resizeMode={'cover'}/>
        </View>
    );
}