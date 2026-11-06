(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const fileInput = byId('file-input');
  const uploadZone = byId('upload-zone');
  const uploadError = byId('upload-error');
  const fileList = byId('file-list');
  const draftNotice = byId('draft-notice');
  const operationalInfo = byId('operational-info');
  const charCount = byId('char-count');
  const dialog = byId('demo-dialog');
  const dialogTitle = byId('dialog-title');
  const dialogBody = byId('dialog-body');
  const dialogOkay = byId('dialog-ok');
  const toast = byId('toast');
  const draftKey = 'dewu-smart-entry-demo:draft:v1';
  const maxFileSize = 100 * 1024 * 1024;
  const files = [];
  let pendingDraftFiles = [];
  let sequence = 0;
  let dragDepth = 0;
  let toastTimer;
  let dialogTrigger;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const paragraph = (text) => element('p', 'modal-copy', text);

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.hidden = true;
    }, 3200);
  }

  function openDialog(title, content, okayText = '我知道了') {
    dialogTrigger = document.activeElement;
    dialogTitle.textContent = title;
    dialogBody.replaceChildren(...content);
    dialogOkay.textContent = okayText;
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  byId('dialog-close').addEventListener('click', closeDialog);
  dialogOkay.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
  });
  dialog.addEventListener('close', () => {
    if (dialogTrigger instanceof HTMLElement && dialogTrigger.isConnected) {
      dialogTrigger.focus({ preventScroll: true });
    }
  });

  function updateCount() {
    operationalInfo.value = operationalInfo.value.slice(0, 100);
    charCount.textContent = `${operationalInfo.value.length} / 100`;
  }

  operationalInfo.addEventListener('input', updateCount);

  function showDraftNotice() {
    draftNotice.replaceChildren();
    draftNotice.hidden = pendingDraftFiles.length === 0;
    if (!pendingDraftFiles.length) return;
    draftNotice.append(element('p', 'draft-hint',
      `已恢复本地草稿。以下图片需重新选择：${pendingDraftFiles.map((file) => file.name).join('、')}`));
  }

  function showErrors(messages) {
    uploadError.textContent = messages.join('；');
    uploadError.hidden = messages.length === 0;
    uploadZone.setAttribute('aria-invalid', messages.length ? 'true' : 'false');
  }

  function sizeLabel(size) {
    return size >= 1024 * 1024
      ? `${(size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.ceil(size / 1024))} KB`;
  }

  function previewFile(item) {
    const preview = element('img', 'preview-image');
    preview.src = item.url;
    preview.alt = item.file.name;
    openDialog('图片预览', [preview, paragraph(item.file.name)]);
  }

  function renderFiles() {
    fileList.replaceChildren();
    fileList.hidden = files.length === 0;
    files.forEach((item) => {
      const row = element('li', 'file-item');
      const thumbnail = element('button', 'file-thumbnail');
      thumbnail.type = 'button';
      thumbnail.setAttribute('aria-label', `预览 ${item.file.name}`);
      const image = element('img');
      image.src = item.url;
      image.alt = '';
      thumbnail.append(image);
      thumbnail.addEventListener('click', () => previewFile(item));
      const metadata = element('div', 'file-meta');
      const name = element('div', 'file-name', item.file.name);
      name.title = item.file.name;
      metadata.append(name, element('div', 'file-status', `${sizeLabel(item.file.size)} · 已添加至本地演示`));
      const remove = element('button', 'file-remove', '移除');
      remove.type = 'button';
      remove.setAttribute('aria-label', `移除 ${item.file.name}`);
      remove.addEventListener('click', () => {
        const index = files.findIndex((file) => file.id === item.id);
        if (index < 0) return;
        URL.revokeObjectURL(files[index].url);
        files.splice(index, 1);
        renderFiles();
        showToast('已移除图片');
        uploadZone.focus({ preventScroll: true });
      });
      row.append(thumbnail, metadata, remove);
      fileList.append(row);
    });
  }

  function addFiles(incoming) {
    const errors = [];
    let added = 0;
    for (const file of Array.from(incoming || [])) {
      const supportedExtension = /\.(jpe?g|png)$/i.test(file.name);
      const supportedType = !file.type || ['image/jpeg', 'image/png'].includes(file.type);
      if (!supportedExtension || !supportedType) {
        errors.push(`${file.name}：仅支持 JPG、PNG 格式`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`${file.name}：图片内容为空，请重新选择`);
        continue;
      }
      if (file.size > maxFileSize) {
        errors.push(`${file.name}：文件大小不能超过 100MB`);
        continue;
      }
      files.push({ id: ++sequence, file, url: URL.createObjectURL(file) });
      pendingDraftFiles = pendingDraftFiles.filter((saved) =>
        saved.name !== file.name || saved.size !== file.size);
      added += 1;
    }
    showErrors(errors);
    renderFiles();
    showDraftNotice();
    if (added) showToast(`已添加 ${added} 张图片，资料仅保留在当前浏览器中`);
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  uploadZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dragDepth += 1;
    uploadZone.classList.add('is-dragging');
  });
  uploadZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  uploadZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) uploadZone.classList.remove('is-dragging');
  });
  uploadZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dragDepth = 0;
    uploadZone.classList.remove('is-dragging');
    addFiles(event.dataTransfer?.files);
  });
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => event.preventDefault());

  byId('save-draft').addEventListener('click', () => {
    const selected = files.map(({ file }) => ({ name: file.name, size: file.size, type: file.type }));
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        version: 1,
        operationalInfo: operationalInfo.value,
        files: [...pendingDraftFiles, ...selected]
      }));
      showToast('草稿已保存至当前浏览器，刷新后图片需重新选择');
    } catch {
      showToast('当前浏览器无法保存草稿，请检查浏览器存储设置');
    }
  });

  byId('confirm-submit').addEventListener('click', () => {
    updateCount();
    if (!files.length) {
      showErrors(['请先上传至少一张 JPG 或 PNG 资质图片']);
      uploadZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      uploadZone.focus({ preventScroll: true });
      return;
    }
    showErrors([]);
    const icon = element('div', 'success-icon', '✓');
    icon.setAttribute('aria-hidden', 'true');
    openDialog('提交演示完成', [
      icon,
      paragraph(`已确认 ${files.length} 张资质图片${operationalInfo.value ? '及公司运营信息' : ''}。`),
      paragraph('本页面为交互演示，资料未上传至得物，未执行真实信息识别或平台审核。')
    ], '返回查看');
  });

  const auxiliaryMessages = {
    scan: ['扫码上传', '当前为扫码上传演示。请使用本页的“点击上传”或拖拽图片体验本地上传；跨设备扫码上传未接入。'],
    course: ['得物商家课堂', '商家课堂入口演示，可在正式商家后台查看入驻及经营课程。'],
    rules: ['入驻规则', '入驻规则入口演示，实际经营要求与资质规则以正式商家后台为准。'],
    report: ['举报', '举报入口演示，本页面不会发起真实举报。'],
    logout: ['退出', '当前为入驻页面演示，无需登录，也不会操作您的得物账号。'],
    video: ['查看入驻视频', '入驻视频入口演示。您可在本页体验资料上传、运营信息填写和提交演示。'],
    service: ['商家客服', '客服入口演示，本页面不会建立真实客服会话。'],
    feedback: ['意见反馈', '反馈入口演示，本页面不会向得物发送消息或反馈。']
  };

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'ai') {
        byId('smart-entry').scrollIntoView({ behavior: 'smooth', block: 'start' });
        uploadZone.focus({ preventScroll: true });
        return;
      }
      if (action === 'sample') {
        const sample = element('img', 'sample-image');
        sample.src = 'assets/trademark-sample.svg';
        sample.alt = '已脱敏的商标注册证示例';
        openDialog('资质材料内容样例', [
          paragraph('请根据实际经营范围准备法人身份证正反面、营业执照、商标注册证、品牌授权书、被授权人身份证正反面等材料。'),
          sample,
          paragraph('图中为脱敏演示样例，上传文件支持 JPG、PNG 格式，单文件不超过 100MB。')
        ]);
        return;
      }
      const message = auxiliaryMessages[action];
      if (message) openDialog(message[0], [paragraph(message[1])]);
    });
  });

  byId('previous-step').addEventListener('click', () => {
    openDialog('填写企业信息', [paragraph('本次演示展示“填写类目资质信息”页面，企业信息步骤未纳入演示范围。')]);
  });

  try {
    const stored = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (stored && typeof stored.operationalInfo === 'string') {
      operationalInfo.value = stored.operationalInfo.slice(0, 100);
      if (Array.isArray(stored.files)) {
        pendingDraftFiles = stored.files
          .filter((file) => file && typeof file.name === 'string' && typeof file.size === 'number')
          .map((file) => ({ name: file.name, size: file.size, type: String(file.type || '') }));
      }
    }
  } catch {
    // An unavailable or invalid local draft should not prevent using the page.
  }
  updateCount();
  showDraftNotice();

  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) files.forEach((item) => URL.revokeObjectURL(item.url));
  });
})();
