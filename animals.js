// Icon mặt động vật cho từng khách (ảnh trong thư mục animals/, xem animals/LICENSE.txt).
// customers.avatar lưu key con vật; màu nền suy ra từ mã khách.
// Không trùng con vật giữa các khách chưa hoàn thành chuyến; khách đã xong thì con vật được dùng lại.
const ANIMALS={
  "water-buffalo":"Trâu",
  "cow":"Bò",
  "cat":"Mèo",
  "dog":"Chó",
  "chicken":"Gà",
  "duck":"Vịt",
  "goose":"Ngỗng",
  "pig":"Lợn",
  "goat":"Dê",
  "horse":"Ngựa",
  "monkey":"Khỉ",
  "bear":"Gấu",
  "panda":"Gấu trúc",
  "tiger":"Hổ",
  "lion":"Sư tử",
  "leopard":"Báo",
  "fox":"Cáo",
  "wolf":"Sói",
  "rabbit":"Thỏ",
  "squirrel":"Sóc",
  "hedgehog":"Nhím",
  "kangaroo":"Chuột túi",
  "koala":"Gấu koala",
  "elephant":"Voi",
  "giraffe":"Hươu cao cổ",
  "deer":"Nai",
  "zebra":"Ngựa vằn",
  "hippo":"Hà mã",
  "rhino":"Tê giác",
  "camel":"Lạc đà",
  "owl":"Cú",
  "parrot":"Vẹt",
  "penguin":"Chim cánh cụt",
  "flamingo":"Hồng hạc",
  "eagle":"Đại bàng",
  "peacock":"Công",
  "sparrow":"Chim sẻ",
  "turtle":"Rùa",
  "frog":"Ếch",
  "dolphin":"Cá heo",
  "whale":"Cá voi",
  "octopus":"Bạch tuộc",
  "crab":"Cua",
  "fish":"Cá",
  "jellyfish":"Sứa",
  "bee":"Ong",
  "butterfly":"Bướm",
  "ladybug":"Bọ rùa",
  "snail":"Ốc sên",
  "ferret":"Chồn",
  "otter":"Rái cá",
  "seal":"Hải cẩu",
  "badger":"Lửng",
  "chameleon":"Tắc kè hoa",
  "dinosaur":"Khủng long",
  "unicorn":"Kỳ lân",
  "crocodile":"Cá sấu",
  "polar-bear":"Gấu Bắc Cực",
  "sloth":"Lười",
  "coyote":"Chó sói đồng cỏ"
};
const AV_BG=['#E8A87C','#85C7B9','#9DB4E0','#E3B5D8','#F2D16B','#B8D88A'];
function avBg(id){ let h=0; for(const ch of String(id||'')) h=(h*31+ch.charCodeAt(0))>>>0; return AV_BG[h%AV_BG.length]; }
function avatarHtml(c,size){
  size=size||28; const k=c&&c.avatar, nm=k&&ANIMALS[k];
  const box=`display:inline-grid;place-items:center;flex:none;width:${size}px;height:${size}px;border-radius:50%;background:${avBg(c&&c.id)};vertical-align:middle`;
  if(nm) return `<span class="av" style="${box}" title="${nm}" role="img" aria-label="${nm}"><img src="animals/${k}.svg" alt="" width="${Math.round(size*.86)}" height="${Math.round(size*.86)}"></span>`;
  const ch=String((c&&c.name)||'?').trim().charAt(0).toUpperCase()||'?';
  return `<span class="av" style="${box};color:#2b1d14;font:700 ${Math.round(size*.45)}px system-ui,sans-serif" aria-hidden="true">${ch.replace(/[<&>"]/g,'')}</span>`;
}
// chọn ngẫu nhiên một con chưa có trong `used` (Set); hết thì chọn con ít người dùng nhất
function pickAnimal(used,counts){
  const keys=Object.keys(ANIMALS), free=keys.filter(k=>!used.has(k));
  if(free.length) return free[Math.floor(Math.random()*free.length)];
  counts=counts||{}; const min=Math.min(...keys.map(k=>counts[k]||0));
  const few=keys.filter(k=>(counts[k]||0)===min); return few[Math.floor(Math.random()*few.length)];
}
