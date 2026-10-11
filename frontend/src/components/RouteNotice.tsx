export default function RouteNotice({loading,error,onHome,onRetry}:{loading?:boolean;error?:string;onHome:()=>void;onRetry?:()=>void}){
 return <section className="empty-state" aria-live="polite"><h1>{loading?'Tur yükleniyor…':error?'Tur açılamadı':'Bu sayfa bulunamadı.'}</h1>{error&&<p role="alert">{error}</p>}{!loading&&<><button className="primary" onClick={onHome}>Oyun alanına dön</button>{onRetry&&<button className="secondary" onClick={onRetry}>Tekrar dene</button>}</>}</section>;
}
