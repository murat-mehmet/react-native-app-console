# STILL IN DEVELOPMENT

# App Console for React Native
*Command from anywhere.*

The goal is to create a simple developer interface to run commands from app.
   
## Installation 
```sh
npm install react-native-app-console --save
yarn add react-native-app-console
```
## Usage
#### Simple usage
```javascript
import {AppConsole} from "react-native-app-console";

const App = () => {
    return (
        <>
            <AppContainer />
            <AppConsole options={{
                name: 'My awesome app'
            }} />
        </>
    );
}
```

## Test 
```sh
npm run test
```
