export type Side = 'all' | 'europe' | 'asia';
export const REGIONS = [
 {id:'europe-center',side:'europe',name:'Merkezi İstanbul',districts:['Beyoğlu','Beşiktaş','Şişli','Fatih','Kağıthane']},
 {id:'europe-esenler',side:'europe',name:'Esenler ve çevresi',districts:['Esenler','Bayrampaşa','Gaziosmanpaşa','Güngören','Bağcılar','Sultangazi']},
 {id:'europe-coast',side:'europe',name:'Bakırköy ve batı sahili',districts:['Bakırköy','Zeytinburnu','Bahçelievler','Küçükçekmece','Avcılar']},
 {id:'europe-north',side:'europe',name:'Sarıyer ve kuzey',districts:['Sarıyer','Eyüpsultan','Arnavutköy','Başakşehir']},
 {id:'europe-west',side:'europe',name:'Beylikdüzü ve ötesi',districts:['Beylikdüzü','Esenyurt','Büyükçekmece','Çatalca','Silivri']},
 {id:'asia-uskudar',side:'asia',name:'Üsküdar ve Boğaz',districts:['Üsküdar','Beykoz']},
 {id:'asia-kadikoy',side:'asia',name:'Kadıköy ve sahil',districts:['Kadıköy','Maltepe','Adalar']},
 {id:'asia-atasehir',side:'asia',name:'Ataşehir ve iç kesimler',districts:['Ataşehir','Ümraniye','Çekmeköy','Sancaktepe','Sultanbeyli']},
 {id:'asia-east',side:'asia',name:'Kartal, Pendik ve Tuzla',districts:['Kartal','Pendik','Tuzla']},
 {id:'asia-sile',side:'asia',name:'Şile ve çevresi',districts:['Şile']},
] as const;
export function quickDistricts(side:Side,region:string):string[]|undefined {
 if(side==='all')return undefined;
 return REGIONS.filter(item=>item.side===side&&(!region||item.id===region)).flatMap(item=>[...item.districts]);
}
