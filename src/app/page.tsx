import style from "./page.module.css";

export default function Home() {
	return (
		<div className={style.start_page}>
			<a className={style.start_page_btn} href="/chat">
				Chat AI
			</a>
		</div>
	);
}
