/**
 * 标签页切换组件
 */

export function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      contents.forEach(c => c.classList.remove('active'));
      document.getElementById(`${target}Results`).classList.add('active');
    });
  });

  return {
    switchTo: (name) => {
      const tab = document.querySelector(`.tab[data-tab="${name}"]`);
      if (tab) tab.click();
    }
  };
}
