<script>
	import { onMount } from "svelte";

	export const size = [23, 10]
	export let coords = [0, 0]
	export const movementInputs = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']

	function buildgame (a, b) {
		let templistA;
		let templistB = [];
		for (let i = 0; i < b; i++) {
			templistA = [];
			for (let j = 0; j < a; j++) {
				templistA.push(1);
			}
			templistB.push(templistA)
		}
		return templistB;
	};

	function game (id) {
		const container = document.getElementById(id);
		container.innerHTML = '';
		let temp = '';
		let game = buildgame(size[0], size[1]);
		for (let i in game) {
			for (let j in game[i]) {
				temp += `<div id="block${i}-${j}" class="p-4 m-1 bg-red-300 hover:bg-yellow-200"></div>`
			}
			temp += '<div class="w-full"></div>'
		}
		container.innerHTML += temp;
		coords = [0, 0]
		stoggle()
	};

	let body = document.getElementsByTagName('body')[0];

	body.addEventListener("keydown", onkeydown_handler)
	body.addEventListener("keyup", onkeyup_handler)

	function onkeydown_handler (event) {
		if (movementInputs.includes(event.key)) {
			let id;
			if ('wasd'.includes(event.key)) {
				id = event.key;
			} else {
				id = (
					(event.key == 'ArrowUp') ? 'w' : (
						(event.key == 'ArrowLeft') ? 'a' : (
							(event.key == 'ArrowDown') ? 's' : 'd')
					)
				)
			}
			let button = document.getElementById(id);
			button.classList.toggle('text-red-300')
			button.classList.toggle('bg-gray-500')
			button.classList.toggle('text-yellow-300')
			button.classList.toggle('bg-gray-600')
		}
		if (event.key == 'w' || event.key == 'ArrowUp') { up('block') } 
		else if (event.key == 'a' || event.key == 'ArrowLeft') { left('block') }
		else if (event.key == 's' || event.key == 'ArrowDown') { down('block') }
		else if (event.key == 'd' || event.key == 'ArrowRight') { right('block') }
		else { console.log('keydown: ' + event.key) }
	}

	function onkeyup_handler (event) {
		if (movementInputs.includes(event.key)) {
			let id;
			if ('wasd'.includes(event.key)) {
				id = event.key;
			} else {
				id = (
					(event.key == 'ArrowUp') ? 'w' : (
						(event.key == 'ArrowLeft') ? 'a' : (
							(event.key == 'ArrowDown') ? 's' : 'd')
					)
				)
			}
			let button = document.getElementById(id);
			button.classList.toggle('text-red-300')
			button.classList.toggle('bg-gray-500')
			button.classList.toggle('text-yellow-300')
			button.classList.toggle('bg-gray-600')
		} else { console.log('keyup: ' + event.key) }
	}

	function stoggle () {
		let item = document.getElementById('block' + coords[1] + '-' + coords[0])

		item.classList.toggle('bg-red-300')
		item.classList.toggle('hover:bg-yellow-200')
		item.classList.toggle('p-4')
		item.classList.toggle('m-1')

		item.classList.toggle('bg-gray-300')
		item.classList.toggle('hover:bg-gray-400')
		item.classList.toggle('p-3')
		item.classList.toggle('m-2')
	}

	function up () {
		stoggle()
		if (coords[1] > 0) { coords[1] -= 1 }
		stoggle()
	}

	function left () {
		stoggle()
		if (coords[0] > 0) { coords[0] -= 1 }
		stoggle()
	}

	function down () {
		stoggle()
		if (coords[1] < size[1] - 1) { coords[1] += 1 }
		stoggle()
	}

	function right () {
		stoggle()
		if (coords[0] < size[0] - 1) { coords[0] += 1 }
		stoggle()
	}

	onMount(() => game('app'))
</script>

<main class="flex justify-center flex-wrap">
	<div id="app" class="w-full flex flex-wrap justify-center m-10"></div>
	<div id="controls" class="flex justify-center flex-wrap">
		<button id="w" on:click={() => up('block')} class="text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 p-2 m-1 w-9">↑</button>
		<div id="controlrow" class="flex justify-center w-full">
			<button id="a" on:click={() => left('block')} class="text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 p-2 m-1 w-9">←</button>
			<button id="s" on:click={() => down('block')} class="text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 p-2 m-1 w-9">↓</button>
			<button id="d" on:click={() => right('block')} class="text-red-300 active:text-yellow-300 active:bg-gray-600 bg-gray-500 p-2 m-1 w-9">→</button>
		</div>
	</div>
	
</main>
