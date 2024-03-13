# name: upgraded-reviewables
# about: Adds functionality for changing reviewables without reload page
# version: 0.0.3
# authors: Awesome Plugin Developer
# url: https://github.com/CochOrg/discourse-reviewable-plugin

register_asset "stylesheets/notifications-styles.scss"

after_initialize do
  module ::UpgradedReviewables
    PLUGIN_NAME = "upgraded-reviewables"

    class Engine < ::Rails::Engine
      isolate_namespace UpgradedReviewables
    end
  end

  %w[
    lib/upgraded_reviewables/reviewables_controller_extension.rb
    lib/upgraded_reviewables/reviewable_queued_post_extension.rb
    lib/upgraded_reviewables/posts_controller_extension.rb
  ].each { |path| require_relative path }

  reloadable_patch do
    ReviewablesController.class_eval { prepend UpgradedReviewables::ReviewablesControllerExtension }
    ReviewableQueuedPost.class_eval { prepend UpgradedReviewables::ReviewableQueuedPostExtension }
    PostsController.class_eval { prepend UpgradedReviewables::PostsControllerExtension }
  end

  Discourse::Application.routes.append do
    get "/updated-reviewable/:reviewable_id" => "reviewables#updated_reviewable",
        :constraints => { reviewable_id: /\d+/ }
  end
end
