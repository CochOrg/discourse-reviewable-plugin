# name: upgraded-reviewables
# about: A super simple plugin to demonstrate how plugins work
# version: 0.0.1
# authors: Awesome Plugin Developer
# url: https://github.com/yourusername/basic-plugin

after_initialize do

  class ::ReviewablesController
    before_action :ensure_can_see, except: [:destroy, :updated_reviewable]

    def update
      reviewable = find_reviewable
      if error = claim_error?(reviewable)
        return render_json_error(error)
      end

      editable = reviewable.editable_for(guardian)
      raise Discourse::InvalidAccess.new unless editable.present?

      # Validate parameters are all editable
      edit_params = params[:reviewable] || {}
      edit_params.each do |name, value|
        if value.is_a?(ActionController::Parameters)
          value.each do |pay_name, pay_value|
            raise Discourse::InvalidAccess.new unless editable.has?("#{name}.#{pay_name}")
          end
        else
          raise Discourse::InvalidAccess.new unless editable.has?(name)
        end
      end

      begin
        if reviewable.update_fields(edit_params, current_user, version: params[:version].to_i)
          result = edit_params.merge(version: reviewable.version)
          if reviewable.topic_id.present?
            MessageBus.publish("/reviewable-update/#{reviewable.topic_id}", { reviewable_id: reviewable.id })
          end
          render json: result
        else
          render_json_error(reviewable.errors)
        end
      rescue Reviewable::UpdateConflict
        render_json_error(I18n.t("reviewables.conflict"), status: 409)
      end
    end

    def updated_reviewable
      reviewable = Reviewable.find(params[:reviewable_id].to_i)
      render json: reviewable, only: [:reviewable_queued_post]
    end
  end


  Discourse::Application.routes.append do
    get "/updated-reviewable/:reviewable_id" => "reviewables#updated_reviewable",
        :constraints => { reviewable_id: /\d+/ }
  end
end
