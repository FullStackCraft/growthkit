/** @jest-environment node */
import { createGrowthKit } from '../src/createGrowthKit';
it('can import, construct and call during SSR without storage or delivery',async()=>{
 const onEvent=jest.fn();const onIdentify=jest.fn();
 const tracker=createGrowthKit({productName:'ssr',onEvent,onIdentify});
 await tracker.track({name:'test'});await tracker.identify();tracker.reset();
 expect(onEvent).not.toHaveBeenCalled();expect(onIdentify).not.toHaveBeenCalled();
});
