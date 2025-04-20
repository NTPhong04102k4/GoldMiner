import React from "react";
import { Dimensions, Image, View } from "react-native";
import { R } from "../../assets";
const {width,height}=Dimensions.get('screen');
export default function GameOver(){
    return(
        <View style={{width:width,height:height,backgroundColor:'red'}}>
            <Image source={R.images.game_over} style={{flex:1,width:width,height:height}} resizeMode={'cover'}/>
        </View>
    );
}