import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { GameItem } from "../../../component/engine/type";
import { R } from "../../../assets";

export const GameItems = React.memo(({ items }: { items: GameItem[] }) => {
    useEffect(() => {
        console.log('Items updated:', items);
    }, [items]);
    
    return (
        <View style={styles.itemsContainer}>
            {items.map((item) => {
                if (item.collected) return null;
                
                let source;
                switch (item.type) {
                    case 'gold1': source = R.images.vang_1; break;
                    case 'gold2': source = R.images.vang_2; break;
                    case 'gold3': source = R.images.vang_3; break;
                    case 'gold4': source = R.images.vang_4; break;
                    case 'rock1': source = R.images.stone_1; break;
                    case 'rock2': source = R.images.stone_2; break;
                    case 'tnt': source = R.images.tnt1; break;
                    default: source = R.images.vang_1;
                }
                
                return (
                    <Image
                        key={item.id}
                        source={source}
                        style={[
                            styles.gameIem,
                            {
                                left: item.x,
                                top: item.y,
                                width: item.width,
                                height: item.height,
                            },
                        ]}
                        resizeMode="stretch"
                    />
                );
            })}
        </View>
    );
});

const styles = StyleSheet.create({
    itemsContainer: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'none',
    },
    gameIem:{
        position:'absolute'
    }
});