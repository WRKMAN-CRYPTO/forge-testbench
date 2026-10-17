/* Wandrune 085 skin asset integrity and recovery checks.
 * Run: node magic-lab/wizard-skin-recovery.tests.js
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
let count=0;
function check(a,msg){assert.ok(a,msg);count++;}
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const script=fs.readFileSync(path.join(__dirname,"skins/wizard-skin-backup-085.js"),"utf8");
const match=script.match(/atlas:"data:image\/webp;base64,([A-Za-z0-9+/=]+)"/);
const masks=script.match(/mask:"data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
check(!!match&&!!masks,"Both original assets are embedded");
const atlas=Buffer.from(match[1],"base64"),mask=Buffer.from(masks[1],"base64");
check(atlas.subarray(0,4).toString("ascii")==="RIFF","Original skin atlas is real WebP");
check(atlas.subarray(8,12).toString("ascii")==="WEBP","Atlas WebP signature");
check(mask.subarray(1,4).toString("ascii")==="PNG","Original dye mask is real PNG");
check(atlas.length>85000&&atlas.length<100000,"Full 20-skin atlas retained");
check(mask.length>4500,"Hue mask retained");
check(html.includes('wizard-skin-backup-085.js?v=085fix'),"Asset script is loaded before game script");
check(html.indexOf("wizard-skin-backup-085.js")<html.indexOf("\n<script>\n(()=>{"),"Bundle loads before game initialization");
check(html.includes('skinBackup?.atlas'),"Classic fallback is not used when bundled art exists");
check(html.includes('id="skinAssetState"'),"Player can see asset load state");
check(html.includes('if(!skinArtReady&&scene&&!scene.load.isLoading())'),"Wardrobe retries image load");
check(html.includes('const skinKey="wrkman-arcane-lab010-skin"'),"Original saved skin key preserved");
check(html.includes('gameStorage.setItem(skinKey+"-selected"'),"Skin equip persistence preserved");
check(html.includes('this.playerSkinSprite=this.add.sprite'),"Loaded spritesheet still renders via Phaser");
check(html.includes('this.setSkin(activeSkin)'),"Original player dye/skin path still used");
check(html.includes('this.load.spritesheet(item.key,item.atlas'),"Sprite loader uses local atlas source");
check(html.includes('this.load.image(item.maskKey,item.mask)'),"Dye masks still load");
let created=0,objects=[];
const blobs={createObjectURL(blob){objects.push(blob);return "blob:skin-"+(++created);}};
const globalWindow={};
vm.runInNewContext(script,{window:globalWindow,atob,
 Uint8Array,Blob,URL:blobs});
const assets=globalWindow.WRKMAN_WIZARD_SKIN_BACKUP;
check(assets.atlas==="blob:skin-1","WebP atlas backed by short local object URL");
check(assets.mask==="blob:skin-2","Dye mask backed by short local object URL");
check(objects[0].type==="image/webp"&&objects[0].size===atlas.length,"WebP blob preserves source bytes");
check(objects[1].type==="image/png"&&objects[1].size===mask.length,"PNG blob preserves source bytes");
console.log("Wandrune wizard skin recovery: "+count+" assertions passed.");
