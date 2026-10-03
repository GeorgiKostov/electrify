import {copy} from '../src/content/copy/en';
const long=/^(tagline|note\d|navigationHelp|lineHelp|placeHelp|scheduleHelp|resetConfirm|watchFirst|noAudio|try|intro|lesson|help|saveNotice)/;
const goals=/^stage\dGoal$/;
const banned=[/stores? electricity/i,/transformers? (makes?|boosts?) (electricity|power)/i,/solar is (clean|free)/i,/electricity runs? out/i,/\b(?:KW|kw|kwh|KWh|kW\/h)\b/];
let errors=0;const seen=new Map<string,string>();
for(const [key,value] of Object.entries(copy)){
 const words=value.trim().split(/\s+/).length,limit=goals.test(key)?12:long.test(key)?40:/^(tooFar|loop|noCoins|wrongVoltage|occupied|outside)$/.test(key)?8:4;
 if(words>limit){console.error(`${key}: ${words} words exceeds ${limit}`);errors++}
 if(!long.test(key)&&!goals.test(key)&&value.endsWith('.')){console.error(`${key}: trailing full stop`);errors++}
 for(const pattern of banned)if(pattern.test(value)){console.error(`${key}: disallowed science or unit wording`);errors++}
 for(const sentence of value.split(/[.!?]/).filter(Boolean))if(sentence.trim().split(/\s+/).length>20){console.error(`${key}: explanation exceeds 20 words`);errors++}
 const prior=seen.get(value);if(prior)console.warn(`${key}: duplicates ${prior}`);else seen.set(value,key);
}
if(errors)process.exitCode=1;else console.log(`${Object.keys(copy).length} copy strings passed`);
