class PushNotifications {
  insertNotificationItem(title, text) {
    const notificationsBlock = document.querySelector('#notifications-block')

    const notificationItem = this.getNotificationItemBlock(title, text)
    this.initNotificationItemEvents(notificationItem)

    notificationsBlock.insertAdjacentElement('afterbegin', notificationItem)

    setTimeout(function() {
      if (notificationItem){
        notificationItem.style.opacity = 0;
        setTimeout(function() {
          notificationItem.remove();
        }, 300);
      }
    }, 1000000);

  }


  getNotificationItemBlock(title, text) {
    const notificationItemHTML = `<div class="notification-item">
      <div class="notification-item__title">${title}</div>
      <div class="notification-item__content">${text}</div>
      <button class="notification-item__button-ok" type="button">
        <div class="notification-item__cross"></div>
      </button>
    </div>`

    return document.createRange().createContextualFragment(notificationItemHTML).firstElementChild
  }

  initNotificationItemEvents(notificationItem){
    let okBtn = notificationItem.querySelector('.notification-item__button-ok')
    okBtn.addEventListener('click', () => {
      notificationItem.remove()
    })
  }

  cutText(text){
    const maxLength = 30
    let trimmedString = text.substring(0, maxLength);
    return trimmedString.substring(0, Math.min(trimmedString.length, trimmedString.lastIndexOf(" "))) + '...'
  }

}

export default PushNotifications
