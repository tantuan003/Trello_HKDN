(async () => {
  const res = await fetch("/layout.html");
  const layout = await res.text();
  document.body.insertAdjacentHTML("afterbegin", layout);
})();
